"use client";

import { useEffect, useRef, useState } from "react";
import type { Progress, ProgressStage, Video } from "@/domain/video.types";
import { dummyDuration } from "@/lib/format";
import { MOCK_PROGRESS, MOCK_VIDEOS } from "@/mock/videos";

const QUEUE_MS = 1500;
const TRANSCODE_MS = 7000;
const TICK_MS = 80;

export function useVideoLibrary() {
  const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);
  const [progress, setProgress] =
    useState<Record<number, Progress>>(MOCK_PROGRESS);
  const idRef = useRef(1000);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  function addVideo(title: string, fileSize: number) {
    const id = ++idRef.current;
    const video: Video = {
      id,
      title,
      status: "queued",
      fileSize,
      error: null,
      duration: "0:00",
      createdAt: new Date().toISOString(),
    };
    setVideos((prev) => [video, ...prev]);
    setProgress((prev) => ({
      ...prev,
      [id]: { stage: "preparing", percent: 0 },
    }));

    const start = Date.now();
    const queue = window.setTimeout(() => {
      setVideos((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: "processing" } : v)),
      );

      const interval = window.setInterval(() => {
        const p = Math.min(1, (Date.now() - start - QUEUE_MS) / TRANSCODE_MS);
        const stage: ProgressStage =
          p < 0.12 ? "preparing" : p < 0.85 ? "processing" : "finishing";
        setProgress((prev) => ({ ...prev, [id]: { stage, percent: p * 100 } }));

        if (p >= 1) {
          window.clearInterval(interval);
          setVideos((prev) =>
            prev.map((v) =>
              v.id === id
                ? { ...v, status: "ready", duration: dummyDuration(fileSize) }
                : v,
            ),
          );
          setProgress((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        }
      }, TICK_MS);

      timersRef.current.push(interval);
    }, QUEUE_MS);

    timersRef.current.push(queue);
  }

  return { videos, progress, addVideo };
}
