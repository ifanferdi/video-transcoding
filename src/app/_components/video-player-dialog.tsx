"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import type { Video } from "@/domain/video.types";
import { createPlayer } from "@/lib/video-player";
import { DEMO_HLS_URL } from "@/mock/videos";

interface VideoPlayerDialogProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayerDialog({ video, onClose }: VideoPlayerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<ReturnType<typeof createPlayer> | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const player = createPlayer(el, DEMO_HLS_URL);
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [video.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">
              {video.title}
            </h2>
            <p className="text-xs text-muted">
              Adaptive quality — Auto / 360 / 480 / 720 / 1080
            </p>
          </div>
          <button
            type="button"
            aria-label="Close player"
            onClick={onClose}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <div data-vjs-player>
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered"
              playsInline
            />
          </div>
        </div>
      </div>
    </div>
  );
}
