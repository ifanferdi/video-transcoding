import config from '@/config/config';
import { VideoRelation } from '@/domain/entities/enums/video.enum';
import { VIDEO_FIELD } from '@/domain/entities/models/video';
import { ErrorBadRequest } from '@/helpers/error.helper';
import { VideoStatus } from '@/infrastructure/database/prisma/generated/enums';
import { z } from 'zod';
import { BaseFindById, BasePagination, NumberSchema, StringSchema } from './base-validation';

const Relations = z.array(z.nativeEnum(VideoRelation)).optional();
const videoColumns = z.array(z.nativeEnum(VIDEO_FIELD)).optional();
const DEFAULT_THUMBNAIL_TIMESTAMP = config.storage.video.defaultThumbnailTimestamp;

export const FindByIdVideoSchema = BaseFindById.extend({
  with: Relations,
  columns: videoColumns,
});

export const FindAllVideoSchema = BasePagination(VIDEO_FIELD).extend({
  status: z.nativeEnum(VideoStatus).optional(),
  with: Relations,
});

export const CreateVideoSchema = z.object({
  title: StringSchema.min(1).max(255),
  sourceKey: StringSchema.min(1).max(500),
  fileSize: NumberSchema.int().positive().nullable().optional(),
  thumbnailTimestamp: NumberSchema.max(500).optional(),
  status: z.nativeEnum(VideoStatus).optional(),
});

export const UpdateVideoSchema = z.object({
  id: NumberSchema,
  status: z.nativeEnum(VideoStatus).default(VideoStatus.queued).optional(),
  hlsKey: StringSchema.max(500).optional(),
  thumbnailKey: StringSchema.max(500).optional(),
  error: StringSchema.optional().nullable(),
});

export const PresignUploadSchema = z.object({
  filename: StringSchema.min(1, 'Filename cannot be empty.'),
  fileType: z.literal('video'),
  contentType: z.enum(config.storage.video.types),
  fileSize: NumberSchema.max(config.storage.maxSize).int().positive(),
  thumbnailTimestamp: NumberSchema.default(DEFAULT_THUMBNAIL_TIMESTAMP).optional(),
});

export const CreateMultipartSchema = PresignUploadSchema.extend({
  fileSize: NumberSchema.max(config.storage.video.multipartThreshold).int().positive(),
});
export const PresignPartSchema = z.object({
  uploadId: StringSchema.min(1),
  partNumbers: z.array(NumberSchema.int().min(1).max(10000)).min(1).max(1000),
});

export const CompleteMultipartSchema = z.object({
  uploadId: StringSchema.min(1),
  parts: z
    .array(
      z.object({
        partNumber: NumberSchema.int().min(1),
        etag: StringSchema.min(1),
      }),
    )
    .min(1),
});

export const TriggerTranscodeSchema = z.object({
  uploadId: StringSchema.min(1).optional(),
});

export type CreateVideoDto = z.infer<typeof CreateVideoSchema>;
export type UpdateVideoDto = z.infer<typeof UpdateVideoSchema>;
export type PresignUploadDto = z.infer<typeof PresignUploadSchema>;
export type CreateMultipartDto = z.infer<typeof CreateMultipartSchema>;
export type PresignPartDto = z.infer<typeof PresignPartSchema>;
export type CompleteMultipartDto = z.infer<typeof CompleteMultipartSchema>;
export type TriggerTranscodeDto = z.infer<typeof TriggerTranscodeSchema>;
export type FindAllVideoDto = z.infer<typeof FindAllVideoSchema>;
export type FindByIdVideoDto = z.infer<typeof FindByIdVideoSchema>;

/**
 * Validasi tipe file video berdasarkan ekstensi filename.
 */
export function validateVideoExtension(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  const allowed = ['mp4', 'webm', 'mov', 'mkv'];

  if (!ext || !allowed.includes(ext)) {
    throw new ErrorBadRequest(`Unsupported video extension. Allowed: ${allowed.join(', ')}`);
  }

  return ext;
}

export function validateVideoSize(fileSize: number) {
  if (fileSize > config.storage.maxSize) {
    throw new ErrorBadRequest(`File size exceeds limit of ${config.storage.maxSize} bytes`);
  }
}
