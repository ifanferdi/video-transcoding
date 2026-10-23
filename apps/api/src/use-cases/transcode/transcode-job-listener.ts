import config from '@/config/config';
import { ProgressEvent } from '@/domain/entities/models/video';
import {
  JobProgressCallback,
  TrancodingStatus,
  TranscodeJobPayload,
} from '@/domain/entities/types/transcode.types';
import { sourceKeyToOutputPrefix } from '@/helpers/common.helper';
import { ErrorNotFound } from '@/helpers/error.helper';
import {
  clampTimestamp,
  generateThumbnail,
  getVideoDuration,
  renditionsFromMaxQuality,
} from '@/helpers/transcode.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import * as fs from 'fs';
import moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import BaseUseCase from '../_base-use-case';
import { TranscodeJobMessage } from '../video/upload/complete-upload';
import { transcodeToHLS } from './_trancode-to-hls';

const DEFAULT_THUMBNAIL_TIMESTAMP = config.storage.video.defaultThumbnailTimestamp;
const PROGRESS_CHANNEL = config.redis.progressChannelPrefix;
const PROGRESS_ACTIVE_KEY = config.redis.progressActiveKey;
const PROGRESS_TTL_SECONDS = config.redis.ttlSeconds;

export default class TranscodeJobListener extends BaseUseCase {
  async execute({ id }: TranscodeJobMessage) {
    try {
      const video = await this.repositories.videoRepository.findOne({ id });
      if (!video) throw 'Video not found.';

      await this.repositories.videoRepository.update({ id: id, status: VideoStatus.processing });

      const sourceKey = video.sourceKey;
      const outputPrefix = sourceKeyToOutputPrefix(sourceKey);
      const thumbnailTimestamp = video.thumbnailTimestamp ?? DEFAULT_THUMBNAIL_TIMESTAMP;
      const result = await this.processTranscodeJob(
        {
          id,
          sourceKey,
          outputPrefix,
          thumbnailTimestamp,
          duration: video.duration ?? undefined,
          maxQuality: video.maxQuality ?? undefined,
        },
        (status, percent, thumbnailKey) => {
          if (!Number.isInteger(percent)) return;
          this.publishProgress(id, status, percent, thumbnailKey);
        },
      );

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.ready,
        hlsKey: result.masterPlaylistKey,
        thumbnailKey: result.thumbnailKey,
        error: null,
      });

      await this.clearProgress(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.failed,
        error: message,
      });

      await this.publishProgress(id, TrancodingStatus.FAILED, 0);
      await this.clearProgress(id);

      // rethrow → BullMQ menandai job gagal (attempts/backoff menangani retry)
      throw error;
    }
  }

  private async publishProgress(
    id: number,
    status: TrancodingStatus,
    percent: number,
    thumbnailPath?: string,
  ) {
    const payload: ProgressEvent = {
      id,
      percent,
      status,
      updatedAt: new Date(),
    };
    if (thumbnailPath) payload.isThumbnailReady = true;

    const message = JSON.stringify(payload);
    const redis = this.repositories.tools.redisRepository;

    // hash = daftar job yang sedang berjalan sekaligus snapshot untuk client baru
    await redis.hset(PROGRESS_ACTIVE_KEY, String(id), message, PROGRESS_TTL_SECONDS);
    await redis.publish(PROGRESS_CHANNEL, message);
  }

  private async clearProgress(id: number) {
    await this.repositories.tools.redisRepository.hdel(PROGRESS_ACTIVE_KEY, String(id));
  }

  private async processTranscodeJob(
    payload: TranscodeJobPayload,
    onProgress?: JobProgressCallback,
  ): Promise<{ masterPlaylistKey: string; thumbnailKey: string }> {
    const {
      id,
      sourceKey,
      outputPrefix,
      thumbnailTimestamp,
      duration: storedDuration,
      maxQuality,
      deleteSourceAfterDone = false,
    } = payload;

    // Gunakan temp directory OS, unik per job (berdasarkan id)
    // supaya job paralel tidak saling bentrok file-nya.
    const workDir = path.join(os.tmpdir(), 'transcode-jobs', String(id));
    const sourceLocalPath = path.join(workDir, 'source', path.basename(sourceKey));
    const outputLocalDir = path.join(workDir, 'output');
    const thumbnailFileName = 'thumbnail.jpg';
    const thumbnailLocalPath = path.join(workDir, thumbnailFileName);
    const thumbnailKey = path.join(outputPrefix, thumbnailFileName);

    const start = performance.now();

    try {
      // ------------------------------------------------------
      // STEP 1: Verifikasi & download source dari S3
      // ------------------------------------------------------
      const isExist = await this.repositories.tools.storageRepository.isExist(sourceKey);
      if (!isExist) throw new ErrorNotFound('Source file not found in storage.');

      onProgress?.(TrancodingStatus.PROCESSING, 0);
      await this.repositories.tools.storageRepository.downloadFile(sourceKey, sourceLocalPath);

      // ------------------------------------------------------
      // STEP 2: Generate & upload thumbnail
      // ------------------------------------------------------

      onProgress?.(TrancodingStatus.PROCESSING, 3);
      const duration = storedDuration ?? (await getVideoDuration(sourceLocalPath));
      const safeTimestamp = clampTimestamp(thumbnailTimestamp, duration);

      await generateThumbnail({
        inputPath: sourceLocalPath,
        outputPath: thumbnailLocalPath,
        timestampSeconds: safeTimestamp,
      });

      // thumbnail upload
      await this.repositories.tools.storageRepository.upload(
        fs.readFileSync(thumbnailLocalPath),
        thumbnailKey,
      );
      // thumbnail update db
      await this.repositories.videoRepository.update({ thumbnailKey, id });

      const thumbnailProgressNum = 5;
      onProgress?.(TrancodingStatus.PROCESSING, thumbnailProgressNum, thumbnailKey);

      // ------------------------------------------------------
      // STEP 3: Transcode ke multi-rendition HLS
      // ------------------------------------------------------
      // Ladder ditentukan maxQuality yang disimpan saat upload — tanpa probe ulang.
      const renditions = renditionsFromMaxQuality(maxQuality);
      const renditionCount = renditions.length;
      const renditionProgress: Record<string, number> = {};

      await transcodeToHLS({
        inputPath: sourceLocalPath,
        outputDir: outputLocalDir,
        renditions,
        onProgress: (rendition, percent) => {
          renditionProgress[rendition] = percent;

          const transcodePercent =
            Object.values(renditionProgress).reduce((a, b) => a + b, 0) / renditionCount;
          const totalPercent = Math.min(
            100,
            thumbnailProgressNum + (transcodePercent / 100) * (100 - thumbnailProgressNum),
          );
          onProgress?.(TrancodingStatus.PROCESSING, Math.round(totalPercent));
        },
      });

      // ------------------------------------------------------
      // STEP 4: Upload hasil transcoding ke S3
      // ------------------------------------------------------
      onProgress?.(TrancodingStatus.FINISHING, 0);

      const files = this.collectFiles(outputLocalDir, outputPrefix);

      // .ts files upload
      for (let i = 0; i < files.length; i++) {
        const { localPath, key } = files[i];
        const fileBuffer = fs.readFileSync(localPath);
        await this.repositories.tools.storageRepository.upload(fileBuffer, key);
        onProgress?.(TrancodingStatus.FINISHING, Math.round(((i + 1) / files.length) * 100));
      }

      // ------------------------------------------------------
      // STEP 5 (opsional): Hapus source asli di S3
      // ------------------------------------------------------
      if (deleteSourceAfterDone) await this.repositories.tools.storageRepository.delete(sourceKey);

      return {
        masterPlaylistKey: `${outputPrefix}/master.m3u8`,
        thumbnailKey: `${outputPrefix}/${thumbnailFileName}`,
      };
    } finally {
      // ------------------------------------------------------
      // STEP 6: Cleanup file temp lokal (selalu, apapun hasilnya)
      // ------------------------------------------------------
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }

      const end = performance.now();
      console.log(`Transcoding file took ${moment.duration(end - start).humanize()}`);
    }
  }

  private collectFiles(
    localDir: string,
    keyPrefix: string,
  ): Array<{ localPath: string; key: string }> {
    const result: Array<{ localPath: string; key: string }> = [];
    const entries = fs.readdirSync(localDir, { withFileTypes: true });

    for (const entry of entries) {
      const localPath = path.join(localDir, entry.name);
      const key = `${keyPrefix}/${entry.name}`;

      if (entry.isDirectory()) {
        result.push(...this.collectFiles(localPath, key));
      } else {
        result.push({ localPath, key });
      }
    }

    return result;
  }
}
