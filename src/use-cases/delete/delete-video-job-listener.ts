import { sourceKeyToOutputPrefix } from '@/helpers/common.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import { DeleteVideoJobMessage } from '@/use-cases/video/delete-video';

/**
 * Worker hapus video: bersihkan object S3 (source + output HLS + thumbnail),
 * lalu hapus record DB.
 *
 * Error dari storage sengaja tidak ditelan → BullMQ retry (attempts/backoff),
 * dan record DB dipertahankan sampai cleanup benar-benar sukses.
 */
export default class DeleteVideoJobListener extends BaseUseCase {
  async execute({ id }: DeleteVideoJobMessage) {
    const video = await this.repositories.videoRepository.findOne({ id });
    if (!video) return; // sudah terhapus — idempotent

    const storage = this.repositories.tools.storageRepository;
    const outputPrefix = sourceKeyToOutputPrefix(video.sourceKey);

    // source = 1 object; outputPrefix mencakup master.m3u8, segment .ts, dan thumbnail.
    await storage.deletePrefix(video.sourceKey);
    await storage.deletePrefix(`${outputPrefix}/`);

    await this.repositories.videoRepository.destroy(id);
  }
}
