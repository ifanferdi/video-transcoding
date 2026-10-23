// "finishing" hanya state sementara di cache client (dari SSE), server tetap mengirim processing/ready.
export type VideoStatus = "uploading" | "queued" | "processing" | "finishing" | "ready" | "failed";

export type ProgressStage = "processing" | "finishing" | "failed";

export type QualityLabel = "144" | "240" | "360" | "480" | "720" | "1080";

export interface Video {
  id: number;
  title: string;
  status: VideoStatus;
  sourceKey: string;
  hlsKey: string | null;
  thumbnailKey: string | null;
  fileSize: number | null;
  thumbnailTimestamp: number;
  maxQuality: string;
  duration: number;
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
  isThumbnailReady?: boolean;
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
