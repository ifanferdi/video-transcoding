"use client";

import { FilmSlate, Play, WarningCircle } from "@phosphor-icons/react";
import type {
  Progress,
  ProgressStage,
  QualityLabel,
  Video,
  VideoStatus,
} from "@/domain/video.types";
import { formatBytes, formatDate } from "@/lib/format";

interface VideoCardProps {
  video: Video;
  progress?: Progress;
  maxQuality?: QualityLabel;
  onPlay?: (video: Video) => void;
}

const THUMB_GRADIENTS = [
  "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  "linear-gradient(135deg, #2d132c 0%, #801336 50%, #c72c41 100%)",
  "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  "linear-gradient(135deg, #3a1c1c 0%, #6b2a2a 50%, #a03c3c 100%)",
  "linear-gradient(135deg, #1b2735 0%, #090a0f 50%, #4a69bd 100%)",
];

const STATUS_META: Record<VideoStatus, { label: string; className: string }> = {
  uploading: {
    label: "Uploading",
    className: "text-status-uploading bg-status-uploading/10",
  },
  queued: {
    label: "Queued",
    className: "text-status-queued bg-status-queued/10",
  },
  processing: {
    label: "Processing",
    className: "text-status-processing bg-status-processing/10",
  },
  ready: { label: "Ready", className: "text-status-ready bg-status-ready/10" },
  failed: {
    label: "Failed",
    className: "text-status-failed bg-status-failed/10",
  },
};

const STAGE_LABEL: Record<ProgressStage, string> = {
  preparing: "Preparing",
  processing: "Transcoding",
  finishing: "Finishing",
};

export function VideoCard({
  video,
  progress,
  maxQuality,
  onPlay,
}: VideoCardProps) {
  const isReady = video.status === "ready";
  const isFailed = video.status === "failed";
  const status = STATUS_META[video.status];
  const showProgress =
    video.status === "uploading" || video.status === "processing";
  const percent = Math.min(progress?.percent ?? 0, 100);
  const gradient = THUMB_GRADIENTS[video.id % THUMB_GRADIENTS.length];

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:bg-surface-hover">
      <button
        type="button"
        disabled={!isReady}
        aria-label={isReady ? `Play ${video.title}` : video.title}
        onClick={() => isReady && onPlay?.(video)}
        className={`relative block aspect-video w-full text-left ${
          isReady ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="absolute inset-0" style={{ background: gradient }} />

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FilmSlate
              size={40}
              weight="light"
              className="text-foreground/15"
            />
          </div>
        )}

        {!isReady && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
          >
            {status.label}
          </span>
        )}

        {isReady && maxQuality && (
          <span className="absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-foreground backdrop-blur">
            {maxQuality}p
          </span>
        )}

        {isReady && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
            <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-accent text-white opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <Play size={24} weight="fill" className="ml-0.5" />
            </span>
          </span>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <WarningCircle
              size={40}
              weight="light"
              className="text-status-failed/70"
            />
          </div>
        )}

        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-foreground">
          {video.duration}
        </span>

        {showProgress && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-8">
            <div className="flex items-center justify-between text-xs text-foreground/90">
              <span>
                {video.status === "processing" && progress
                  ? STAGE_LABEL[progress.stage]
                  : "Uploading"}
              </span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${
                  video.status === "processing"
                    ? "bg-status-processing"
                    : "bg-status-uploading"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </button>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {video.title}
        </h3>
        <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
          <span>{formatBytes(video.fileSize)}</span>
          <span>{formatDate(video.createdAt)}</span>
        </div>
        {isFailed && video.error && (
          <p className="mt-1.5 line-clamp-2 text-xs text-status-failed">
            {video.error}
          </p>
        )}
      </div>
    </article>
  );
}
