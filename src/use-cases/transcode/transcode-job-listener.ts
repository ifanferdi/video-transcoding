import { VideoStatus } from '@/domain/entities/enums/video.enum';
import {
  JobProgressCallback,
  RENDITION_LADDER,
  TranscodeJobPayload,
} from '@/domain/entities/types/transcode.types';
import { sourceKeyToOutputPrefix } from '@/helpers/common.helper';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import BaseUseCase from '../_base-use-case';
import { TranscodeJobMessage } from '../video/upload/upload-complete';
import { transcodeToHLS } from './trancode-to-hls';

export default class TranscodeJobListener extends BaseUseCase {
  async execute({ id }: TranscodeJobMessage) {
    const video = await this.repositories.videoRepository.findOne({ id: id });
    if (!video) return console.error('Video not found.');

    await this.repositories.videoRepository.update({
      id: id,
      status: VideoStatus.PROCESSING,
      progress: 0,
    });

    const sourceKey = video.sourceKey;
    const outputPrefix = sourceKeyToOutputPrefix(sourceKey);
    const result = await this.processTranscodeJob(
      { id, sourceKey, outputPrefix },
      (status, percent) => {
        console.log(status, percent);
      },
    );

    await this.repositories.videoRepository.update({
      id: id,
      status: VideoStatus.READY,
      progress: 0,
    });

    await this.repositories.tools.storageRepository.delete(sourceKey);

    // console.log('Job done. Master playlist key: ', result.masterPlaylistKey);
  }

  private async processTranscodeJob(
    payload: TranscodeJobPayload,
    onProgress?: JobProgressCallback,
  ): Promise<{ masterPlaylistKey: string }> {
    const { id, sourceKey, outputPrefix, deleteSourceAfterDone = false } = payload;

    // Gunakan temp directory OS, unik per job (berdasarkan id)
    // supaya job paralel tidak saling bentrok file-nya.
    const workDir = path.join(os.tmpdir(), 'transcode-jobs', String(id));
    const sourceLocalPath = path.join(workDir, 'source', path.basename(sourceKey));
    const outputLocalDir = path.join(workDir, 'output');

    try {
      // ------------------------------------------------------
      // STEP 1: Verifikasi & download source dari S3
      // ------------------------------------------------------
      await this.repositories.tools.storageRepository.isExist(sourceKey);

      onProgress?.('downloading', 0);
      await this.repositories.tools.storageRepository.downloadFile(sourceKey, sourceLocalPath);
      onProgress?.('downloading', 100);

      // ------------------------------------------------------
      // STEP 2: Transcode ke multi-rendition HLS
      // ------------------------------------------------------
      const renditionCount = RENDITION_LADDER.length;
      const renditionProgress: Record<string, number> = {};

      await transcodeToHLS({
        inputPath: sourceLocalPath,
        outputDir: outputLocalDir,
        onProgress: (rendition, percent) => {
          renditionProgress[rendition] = percent;

          const totalPercent =
            Object.values(renditionProgress).reduce((a, b) => a + b, 0) / renditionCount;
          onProgress?.('transcoding', totalPercent);
        },
      });

      // ------------------------------------------------------
      // STEP 3: Upload hasil transcoding ke S3
      // ------------------------------------------------------
      onProgress?.('uploading', 0);
      await this.repositories.tools.storageRepository.uploadDirectory(outputLocalDir, outputPrefix);
      onProgress?.('uploading', 100);

      // ------------------------------------------------------
      // STEP 5 (opsional): Hapus source asli di S3
      // ------------------------------------------------------
      if (deleteSourceAfterDone) await this.repositories.tools.storageRepository.delete(sourceKey);

      return { masterPlaylistKey: `${outputPrefix}/master.m3u8` };
    } finally {
      // ------------------------------------------------------
      // STEP 4: Cleanup file temp lokal (selalu, apapun hasilnya)
      // ------------------------------------------------------
      onProgress?.('cleaning', 0);
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
      }
      onProgress?.('cleaning', 100);
    }
  }
}
