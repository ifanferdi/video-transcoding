export type VideoStatus =
  "uploading" | "queued" | "processing" | "ready" | "failed";

export type ProgressStage = "preparing" | "processing" | "finishing";

export type QualityLabel = "360" | "480" | "720" | "1080";

export interface Video {
  id: number;
  title: string;
  status: VideoStatus;
  fileSize: number | null;
  error: string | null;
  duration: string;
  createdAt: string;
}

export interface Progress {
  stage: ProgressStage;
  percent: number;
}
