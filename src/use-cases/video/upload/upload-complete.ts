import { VideoStatus } from '@/domain/entities/enums/video.enum';
import { ErrorBadRequest, ErrorNotFound } from '@/helpers/error.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { TriggerTranscodeDto } from '@/validations/video-validation';

export interface TranscodeJobMessage {
  id: number;
  sourceKey: string;
  title: string;
}

/**
 * Fase 1 — Endpoint "complete upload" untuk trigger job transcoding.
 * Flow: verifikasi source sudah ada di storage → update status queued → publish ke RabbitMQ.
 * Worker Golang consume queue `transcode.jobs` dan mulai FFmpeg.
 */
export default class UploadComplete extends BaseUseCase {
  async execute(id: number, body: TriggerTranscodeDto = {}) {
    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    // if (video.status === VideoStatus.PROCESSING || video.status === VideoStatus.READY) {
    //   throw new ErrorBadRequest(`Video already ${video.status}.`);
    // }

    const sourceKey = video.sourceKey;

    // pastikan source file benar-benar sudah ter-upload sebelum enqueue
    const isExist = await this.repositories.tools.storageRepository.isExist(sourceKey);
    if (!isExist) {
      throw new ErrorBadRequest('Source file not found in storage. Upload not complete.');
    }

    const rabbitmqRepository = this.repositories.tools.rabbitmqRepository;
    if (!rabbitmqRepository) {
      throw new ErrorBadRequest('Queue unavailable. Transcoding not configured.');
    }

    const message: TranscodeJobMessage = {
      id: id,
      sourceKey,
      title: video.title,
    };

    await rabbitmqRepository.publishJob('transcode.jobs', message);

    return this.repositories.videoRepository.update({
      id,
      status: VideoStatus.QUEUED,
      error: null,
      progress: 0,
    });
  }
}
