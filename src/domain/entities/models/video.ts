import { VideoScalarFieldEnum } from '@/infrastructure/database/prisma/generated/internal/prismaNamespace';

export const VIDEO_FIELD = VideoScalarFieldEnum;
export type VIDEO_FIELD = (typeof VIDEO_FIELD)[keyof typeof VIDEO_FIELD];
export const VIDEO_FIELDS = Object.keys(VIDEO_FIELD) as VIDEO_FIELD[];
export const VIDEO_FIELDS_PRISMA = Object.fromEntries(VIDEO_FIELDS.map((col) => [col, true]));
