import { sourceKeyToOutputPrefix } from '@/helpers/common.helper';
import S3StorageRepository from '@/repositories/filesystem/s3-storage-repository';
import BaseUseCase from '@/use-cases/_base-use-case';

export interface DeleteVideoJobMessage {
  id: number;
  sourceKey: string;
}

/**
 * Hapus semua object S3 milik satu video: source, master.m3u8, segment, thumbnail.
 * Dipakai worker `delete.jobs`, sekaligus fallback saat queue tidak tersedia.
 * Error sengaja tidak ditelan → pemanggil bisa retry / melaporkan ke client.
 */
export async function deleteVideoObjects(
  storage: S3StorageRepository,
  { sourceKey }: DeleteVideoJobMessage,
) {
  const outputPrefix = sourceKeyToOutputPrefix(sourceKey);

  await storage.deletePrefix(sourceKey);
  await storage.deletePrefix(`${outputPrefix}/`);
}

/**
 * Worker hapus file video. Record DB sudah dihapus lebih dulu oleh DeleteVideo,
 * jadi payload job membawa key yang dibutuhkan — worker tidak membaca DB lagi.
 */
export default class DeleteVideoJobListener extends BaseUseCase {
  async execute(message: DeleteVideoJobMessage) {
    await deleteVideoObjects(this.repositories.tools.storageRepository, message);
  }
}
