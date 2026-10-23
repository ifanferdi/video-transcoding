"use client";

import { Button } from "@/components/ui/button";
import type { Video } from "@/domain/video.types";
import { createPlayer } from "@/lib/video-player";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface VideoPlayerDialogProps {
  video: Video;
  onClose: () => void;
}

export function VideoPlayerDialog({ video, onClose }: VideoPlayerDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof createPlayer> | null>(null);

  const masterUrl = video?.playback?.masterUrl;

  useEffect(() => {
    if (!masterUrl) return;
    const container = containerRef.current;
    if (!container) return;
    const player = createPlayer(container, masterUrl);
    playerRef.current = player;
    return () => {
      player.dispose();
      playerRef.current = null;
    };
  }, [masterUrl]);

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
      <div className="w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{video.title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Close player"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-black">
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
}
