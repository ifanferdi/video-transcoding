"use client";

import type { Progress, ProgressEvent, VideoStatus } from "@/domain/video.types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

type Tracked = { id: number; status: VideoStatus };

const ACTIVE_STATUSES: VideoStatus[] = ["queued", "processing"];

/**
 * `finishing` dikirim per file yang selesai di-upload ke storage (bisa
 * ratusan per job), jadi refetch list ditahan sampai event berhenti.
 * shortcut: tidak ada event terminal dari server, jadi refetch bisa jatuh
 * sebelum status di DB jadi `ready`; pakai event terminal kalau API diubah.
 */
const REFETCH_DEBOUNCE_MS = 1_000;

/**
 * Stream progres global (GET /api/v1/videos/progress): satu koneksi untuk semua
 * job aktif, event berisi `id`. Server tidak menutup stream, jadi koneksi hanya
 * dibuka selama masih ada job queued/processing.
 */
export function useProgress(videos: Tracked[]) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<Record<number, Progress>>({});
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasActiveJob = videos.some((video) => ACTIVE_STATUSES.includes(video.status));

  // Timer dibersihkan saat unmount saja — kalau ikut cleanup effect di bawah,
  // refetch terakhir yang tertunda bisa hilang saat job selesai.
  useEffect(
    () => () => {
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    },
    [],
  );

  useEffect(() => {
    if (!hasActiveJob) return;

    const source = new EventSource("/api/proxy/videos/progress");
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
