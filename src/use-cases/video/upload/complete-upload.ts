import { ErrorBadRequest, ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import { TriggerTranscodeDto } from '@/validations/video-validation';
export interface TranscodeJobMessage {
  id: number;
}


export default class CompleteUpload extends BaseUseCase {
  async execute(id: number, body: TriggerTranscodeDto = {}) {
    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    if (video.status === VideoStatus.processing || video.status === VideoStatus.ready)
      throw new ErrorBadRequest(`Video already ${video.status}.`);

    const sourceKey = video.sourceKey;

    // pastikan source file benar-benar sudah ter-upload sebelum enqueue
    const isExist = await this.repositories.tools.storageRepository.isExist(sourceKey);
    if (!isExist)
      throw new ErrorBadRequest('Source file not found in storage. Upload not complete.');

    const rabbitmqRepository = this.repositories.tools.rabbitmqRepository;
    if (!rabbitmqRepository)
      throw new ErrorBadRequest('Queue unavailable. Transcoding not configured.');

    await rabbitmqRepository.publishJob<TranscodeJobMessage>('transcode.jobs', { id });

    return this.repositories.videoRepository.update({
      id,
      status: VideoStatus.queued,
      error: null,
    });
  }
}
