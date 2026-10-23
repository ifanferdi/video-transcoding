import { ErrorBadRequest, ErrorConflict, ErrorNotFound } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import BaseUseCase from '@/use-cases/_base-use-case';
import {
  DeleteVideoJobMessage,
  deleteVideoObjects,
} from '@/use-cases/delete/delete-video-job-listener';

/**
 * DELETE — record DB dihapus sinkron (video langsung hilang dari list client),
 * lalu cleanup object S3 di-enqueue ke worker `delete.jobs`.
 */
export default class DeleteVideo extends BaseUseCase {
  async execute(id: number) {
    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) throw new ErrorNotFound('Video not found.');

    if (video.status === VideoStatus.queued || video.status === VideoStatus.processing)
      throw new ErrorConflict(
        `Video is ${video.status}. Wait for the job to finish before deleting.`,
      );

    const queue = this.repositories.tools.bullmqRepository;
    if (!queue) throw new ErrorBadRequest('Queue unavailable. Delete not configured.');

    // Payload minimal & JSON-safe — worker cuma butuh key, bukan seluruh row.
    const job: DeleteVideoJobMessage = { id, sourceKey: video.sourceKey };

    await this.repositories.videoRepository.destroy(id);

    try {
      await queue.publishJob<DeleteVideoJobMessage>('delete.jobs', job);
      return { id, message: 'Video deletion queued.' };
    } catch {
      // Queue mati → tidak ada yang bisa retry, jadi bersihkan storage langsung
      // supaya object S3 tidak tertinggal sebagai orphan.
      await deleteVideoObjects(this.repositories.tools.storageRepository, job);
      return { id, message: 'Video deleted.' };
    }
  }
}
