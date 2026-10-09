import config from '@/config/config';
import { ProgressEvent } from '@/domain/entities/models/video';
import {
  JobProgressCallback,
  RENDITION_LADDER,
  TrancodingStatus,
  TranscodeJobPayload,
} from '@/domain/entities/types/transcode.types';
import { channelName, sourceKeyToOutputPrefix } from '@/helpers/common.helper';
import { ErrorNotFound } from '@/helpers/error.helper';
import { clampTimestamp, generateThumbnail, getVideoDuration } from '@/helpers/thumbnail.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import * as fs from 'fs';
import moment from 'moment';
import * as os from 'os';
import * as path from 'path';
import BaseUseCase from '../_base-use-case';
import { TranscodeJobMessage } from '../video/upload/complete-upload';
import { transcodeToHLS } from './_trancode-to-hls';

const DEFAULT_THUMBNAIL_TIMESTAMP = config.storage.video.defaultThumbnailTimestamp;

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
        { id, sourceKey, outputPrefix, thumbnailTimestamp },
        (status, percent, thumbnailKey) => this.publishProgress(id, status, percent, thumbnailKey),
      );

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.ready,
        hlsKey: result.masterPlaylistKey,
        thumbnailKey: result.thumbnailKey,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.failed,
        error: message,
      });

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
    if (thumbnailPath)
      payload.meta = {
        thumbnailUrl: await this.repositories.tools.storageRepository.getUrl(thumbnailPath),
      };

    this.repositories.tools.redisRepository.publish(
      channelName(String(id)),
      `${JSON.stringify(payload)}\n`,
    );
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

      onProgress?.(TrancodingStatus.PREPARING, 0);
      await this.repositories.tools.storageRepository.downloadFile(sourceKey, sourceLocalPath);
      onProgress?.(TrancodingStatus.PREPARING, 100);

      // ------------------------------------------------------
      // STEP 2: Generate & upload thumbnail
      // ------------------------------------------------------
      onProgress?.(TrancodingStatus.PROCESSING, 0);

      const duration = await getVideoDuration(sourceLocalPath);
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

      const thumbnailProgressNum = 5;
      onProgress?.(TrancodingStatus.PROCESSING, thumbnailProgressNum, thumbnailKey);

      // ------------------------------------------------------
      // STEP 3: Transcode ke multi-rendition HLS
      // ------------------------------------------------------
      const renditionCount = RENDITION_LADDER.length;
      const renditionProgress: Record<string, number> = {};

      await transcodeToHLS({
        inputPath: sourceLocalPath,
        outputDir: outputLocalDir,
        onProgress: (rendition, percent) => {
          renditionProgress[rendition] = percent;

          const totalPercent =
            Object.values(renditionProgress).reduce((a, b) => a + b, thumbnailProgressNum) /
            renditionCount;
          onProgress?.(TrancodingStatus.PROCESSING, totalPercent);
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
