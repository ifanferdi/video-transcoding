import { ErrorBadRequest, ErrorConflict, ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';

export interface DeleteVideoJobMessage {
  id: number;
}

/**
 * DELETE — enqueue job untuk hapus video + seluruh object S3-nya.
 * Record DB baru dihapus oleh worker setelah storage bersih (lihat DeleteVideoJobListener).
 */
export default class DeleteVideo extends BaseUseCase {
  async execute(id: number) {
    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    if (video.status === VideoStatus.queued || video.status === VideoStatus.processing)
      throw new ErrorConflict(
        `Video is ${video.status}. Wait for the job to finish before deleting.`,
      );

    const queue = this.repositories.tools.rabbitmqRepository;
    if (!queue) throw new ErrorBadRequest('Queue unavailable. Delete not configured.');

    await queue.publishJob<DeleteVideoJobMessage>('delete.jobs', { id });

    return { id, message: 'Video deletion queued.' };
  }
}
