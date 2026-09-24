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
import { TranscodeJobMessage } from '../video/upload/upload-complete';
import { transcodeToHLS } from './trancode-to-hls';

export default class TranscodeJobListener extends BaseUseCase {
  async execute({ id }: TranscodeJobMessage) {
    try {
      const video = await this.repositories.videoRepository.findOne({ id });
      if (!video) throw 'Video not found.';

      await this.repositories.videoRepository.update({ id: id, status: VideoStatus.processing });

      const sourceKey = video.sourceKey;
      const outputPrefix = sourceKeyToOutputPrefix(sourceKey);
      const result = await this.processTranscodeJob(
        { id, sourceKey, outputPrefix, thumbnailTimestamp: video.thumbnailTimestamp },
        (status, percent) => this.publishProgress(id, status, percent),
      );

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.ready,
        hlsKey: result.masterPlaylistKey,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.repositories.videoRepository.update({
        id: id,
        status: VideoStatus.failed,
        error: message,
      });

      this.publishProgress(id, TrancodingStatus.FAILED, 0);

      // rethrow → BullMQ menandai job gagal (attempts/backoff menangani retry)
      throw error;
    }
  }

  private publishProgress(id: number, status: TrancodingStatus, percent: number) {
    const payload: ProgressEvent = {
      id,
      percent,
      status,
      updatedAt: new Date(),
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

      onProgress?.(TrancodingStatus.DOWNLOADING, 0);
      await this.repositories.tools.storageRepository.downloadFile(sourceKey, sourceLocalPath);
      onProgress?.(TrancodingStatus.DOWNLOADING, 100);

      // ------------------------------------------------------
      // STEP 2: Generate thumbnail
      // ------------------------------------------------------
      onProgress?.(TrancodingStatus.THUMBNAIL, 0);

      // Validasi timestamp yang diminta client terhadap durasi video asli.
      // Client bisa saja kirim detik yang melebihi durasi video (bug UI,
      // atau video ternyata lebih pendek dari yang dikira client saat
      // request dibuat) — clamp supaya FFmpeg tidak gagal karena seek
      // ke posisi yang tidak ada.
      const duration = await getVideoDuration(sourceLocalPath);
      const safeTimestamp = clampTimestamp(thumbnailTimestamp, duration);

      await generateThumbnail({
        inputPath: sourceLocalPath,
        outputPath: thumbnailLocalPath,
        timestampSeconds: safeTimestamp,
      });
      onProgress?.(TrancodingStatus.THUMBNAIL, 100);

      // ------------------------------------------------------
      // STEP 3: Transcode ke multi-rendition HLS
      // ------------------------------------------------------
      const renditionCount = RENDITION_LADDER.length;
      const renditionProgress: Record<string, number> = {};
      onProgress?.(TrancodingStatus.TRANSCODING, 0);

      await transcodeToHLS({
        inputPath: sourceLocalPath,
        outputDir: outputLocalDir,
        onProgress: (rendition, percent) => {
          renditionProgress[rendition] = percent;

          const totalPercent =
            Object.values(renditionProgress).reduce((a, b) => a + b, 0) / renditionCount;
          onProgress?.(TrancodingStatus.TRANSCODING, totalPercent);
        },
      });

      // ------------------------------------------------------
      // STEP 4: Upload hasil transcoding ke S3
      // ------------------------------------------------------
      onProgress?.(TrancodingStatus.UPLOADING, 0);
      await this.repositories.tools.storageRepository.upload(
        fs.readFileSync(thumbnailLocalPath),
        thumbnailKey,
      );
      await this.repositories.tools.storageRepository.uploadDirectory(outputLocalDir, outputPrefix);
      onProgress?.(TrancodingStatus.UPLOADING, 100);

      // ------------------------------------------------------
      // STEP 6 (opsional): Hapus source asli di S3
      // ------------------------------------------------------
      if (deleteSourceAfterDone) await this.repositories.tools.storageRepository.delete(sourceKey);

      return { masterPlaylistKey: `${outputPrefix}/master.m3u8`, thumbnailKey };
    } finally {
      // ------------------------------------------------------
      // STEP 5: Cleanup file temp lokal (selalu, apapun hasilnya)
      // ------------------------------------------------------
      onProgress?.(TrancodingStatus.CLEANING, 0);
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      onProgress?.(TrancodingStatus.CLEANING, 100);

      const end = performance.now();
      console.log(`Transcoding file took ${moment.duration(end - start).humanize()}`);
    }
  }
}
