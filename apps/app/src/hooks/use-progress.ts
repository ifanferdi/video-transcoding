"use client";

import type { Progress, ProgressEvent, VideoStatus } from "@/domain/video.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type Tracked = { id: number; status: VideoStatus };

const ACTIVE_STATUSES: VideoStatus[] = ["queued", "processing"];

const REFETCH_DEBOUNCE_MS = 1_000;

export function useProgress(videos: Tracked[]) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveJob = videos.some((video) => ACTIVE_STATUSES.includes(video.status));

  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!hasActiveJob) return;

    const source = new EventSource("/api/videos/progress");
    source.onmessage = (event) => {
      let payload: ProgressEvent;
      try {
        payload = JSON.parse(event.data) as ProgressEvent;
      } catch {
        return; // event rusak — lanjut ke event berikutnya
      }
      if (payload.isThumbnailReady) queryClient.invalidateQueries({ queryKey: ["videos"] });

      setProgress((prev) => ({
        ...prev,
        [payload.id]: {
          stage: payload.status,
          percent: Math.min(payload.percent, 100),
        },
      }));

      // Job berhenti di sini: refresh list supaya status di card ikut berubah.
      if (payload.status === "failed") {
        queryClient.invalidateQueries({ queryKey: ["videos"] });
        return;
      }

      if (payload.status === "finishing") {
        if (refetchTimer.current) clearTimeout(refetchTimer.current);
        if (payload.percent >= 100)
          refetchTimer.current = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["videos"] });
          }, REFETCH_DEBOUNCE_MS);
      }
    };

    return () => source.close();
  }, [hasActiveJob, queryClient]);

  return progress;
}
