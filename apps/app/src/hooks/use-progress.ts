"use client";

import type { ListResponse, Progress, ProgressEvent, VideoStatus } from "@/domain/video.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type Tracked = { id: number; status: VideoStatus };

const ACTIVE_STATUSES: VideoStatus[] = ["queued", "processing", "finishing"];

const REFETCH_DEBOUNCE_MS = 500;

export function useProgress(videos: Tracked[]) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  // const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveJob = videos.some((video) => ACTIVE_STATUSES.includes(video.status));

  // useEffect(
  //   () => () => {
  //     if (refetchTimer.current) clearTimeout(refetchTimer.current);
  //   },
  //   [],
  // );

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
        // Badge card ikut "Finishing" tanpa menunggu refetch list.
        queryClient.setQueryData<ListResponse>(
          ["videos"],
          (prev) =>
            prev && {
              ...prev,
              data: prev.data.map((video) =>
                video.id === payload.id ? { ...video, status: "finishing" } : video,
              ),
            },
        );
        // if (refetchTimer.current) clearTimeout(refetchTimer.current);
        if (payload.percent >= 100) {
          // refetchTimer.current = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["videos"] });
          console.log("eaeae");

          // }, REFETCH_DEBOUNCE_MS);
          return () => source.close();
        }
      }
    };

    return () => source.close();
  }, [hasActiveJob, queryClient]);

  return progress;
}
