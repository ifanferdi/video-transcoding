"use client";

import { Button } from "@/components/ui/button";
import type { Progress, ProgressStage, Video, VideoStatus } from "@/domain/video.types";
import { getMasterMaxQuality } from "@/features/videos/api";
import { dummyDuration, formatBytes, formatDate } from "@/lib/helper";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Film, Play, Trash2 } from "lucide-react";

interface VideoCardProps {
  video: Video;
  progress?: Progress;
  onPlay?: (video: Video) => void;
  onDelete?: (video: Video) => void;
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
  failed: "Failed",
};

export function VideoCard({ video, progress, onPlay, onDelete }: VideoCardProps) {
  const isReady = video.status === "ready";
  const isFailed = video.status === "failed";
  const isProcessing = video.status === "processing";
  // Backend menolak delete selama job masih queued/processing.
  const canDelete = !isProcessing && video.status !== "queued" && Boolean(onDelete);
  const status = STATUS_META[video.status];
  const percent = Math.min(progress?.percent ?? 0, 100);
  const gradient = THUMB_GRADIENTS[video.id % THUMB_GRADIENTS.length];

  const thumbnailUrl = video.playback?.thumbnailUrl;

  const masterUrl = video?.playback?.masterUrl;

  const maxQualityQuery = useQuery({
    queryKey: ["hls-max", video.id],
    queryFn: () => getMasterMaxQuality(masterUrl!),
    enabled: !!masterUrl,
    staleTime: Infinity,
  });
  const maxQuality = maxQualityQuery.data ?? null;

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
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not optimizable
          <img src={thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film size={40} strokeWidth={1.5} className="text-foreground/15" />
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
            <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-gray-300 text-black opacity-0 shadow-lg transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
              <Play size={24} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
        )}

        {isFailed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CircleAlert size={40} strokeWidth={1.5} className="text-status-failed/70" />
          </div>
        )}

        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-foreground">
          {dummyDuration(video.fileSize)}
        </span>

        {isProcessing && (
          <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-3 pt-8">
            <div className="flex items-center justify-between text-xs text-foreground/90">
              <span>{progress ? STAGE_LABEL[progress.stage] : "Processing"}</span>
              <span>{Math.round(percent)}%</span>
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-status-processing transition-[width] duration-150"
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
        <div className="mt-1.5 flex items-center justify-between gap-1 text-xs text-muted">
          <span>{formatBytes(video.fileSize)}</span>
          <span className="ml-auto">{formatDate(video.createdAt)}</span>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${video.title}`}
              onClick={() => onDelete?.(video)}
              className="text-accent!"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
        {isFailed && video.error && (
          <p className="mt-1.5 line-clamp-2 text-xs text-status-failed">{video.error}</p>
        )}
      </div>
    </article>
  );
}
