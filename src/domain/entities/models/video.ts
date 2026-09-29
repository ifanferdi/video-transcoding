import { Video } from '@/infrastructure/database/prisma/generated/client';
import { VideoScalarFieldEnum } from '@/infrastructure/database/prisma/generated/internal/prismaNamespace';
import { TrancodingStatus } from '../types/transcode.types';

export interface ResponseVideo extends Video {
  playback?: { masterUrl?: string; thumbnailUrl?: string; expiresIn?: Date };
}

export interface ProgressEvent {
  id: number;
  status: TrancodingStatus;
  percent: number;
  updatedAt: Date;
}

export const VIDEO_FIELD = VideoScalarFieldEnum;
export type VIDEO_FIELD = (typeof VIDEO_FIELD)[keyof typeof VIDEO_FIELD];
export const VIDEO_FIELDS = Object.keys(VIDEO_FIELD) as VIDEO_FIELD[];
export const VIDEO_FIELDS_PRISMA = Object.fromEntries(VIDEO_FIELDS.map((col) => [col, true]));
