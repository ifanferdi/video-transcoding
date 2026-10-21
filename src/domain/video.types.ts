export type VideoStatus = "uploading" | "queued" | "processing" | "ready" | "failed";

export type ProgressStage = "preparing" | "processing" | "finishing" | "failed";

export type QualityLabel = "360" | "480" | "720" | "1080";

export interface Video {
  id: number;
  title: string;
  status: VideoStatus;
  sourceKey: string;
  hlsKey: string | null;
  thumbnailKey: string | null;
  fileSize: number | null;
  thumbnailTimestamp: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  playback?: Playback;
}

export interface Playback {
  masterUrl?: string;
  thumbnailUrl?: string;
  expiresIn?: string;
}

export interface Upload {
  key: string;
  method: "PUT";
  presignUrl: string;
  expiresAt: string;
}

export type PresignResponse = Video & { upload: Upload };

export interface ProgressEvent {
  id: number;
  status: ProgressStage;
  percent: number;
  updatedAt: string;
  meta?: { thumbnailUrl: string };
}

export interface Progress {
  stage: ProgressStage;
  percent: number;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ListResponse {
  data: Video[];
  meta: PageMeta;
}

export interface ApiError {
  message: string;
}
