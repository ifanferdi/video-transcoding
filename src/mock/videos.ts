import type { Progress, QualityLabel, Video } from "@/domain/video.types";

export const DEMO_HLS_URL = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

export const MOCK_VIDEOS: Video[] = [
  {
    id: 1,
    title: "Big Buck Bunny — 4K Master.mp4",
    status: "ready",
    fileSize: 214_748_364,
    error: null,
    duration: "10:34",
    createdAt: "2026-10-07T08:00:00Z",
  },
  {
    id: 2,
    title: "Sintel — Official Trailer.mp4",
    status: "ready",
    fileSize: 98_304_000,
    error: null,
    duration: "2:12",
    createdAt: "2026-10-06T14:20:00Z",
  },
  {
    id: 3,
    title: "Podcast Episode #12 — Studio Cut.mp4",
    status: "processing",
    fileSize: 152_000_000,
    error: null,
    duration: "0:00",
    createdAt: "2026-10-08T09:15:00Z",
  },
  {
    id: 4,
    title: "Product Demo — Q3 Launch.mp4",
    status: "queued",
    fileSize: 45_000_000,
    error: null,
    duration: "0:00",
    createdAt: "2026-10-08T10:02:00Z",
  },
  {
    id: 5,
    title: "Screen Recording — Bug Walkthrough.mp4",
    status: "uploading",
    fileSize: 23_000_000,
    error: null,
    duration: "0:00",
    createdAt: "2026-10-08T10:30:00Z",
  },
  {
    id: 6,
    title: "Corrupted Import — client.webm",
    status: "failed",
    fileSize: 12_000_000,
    error: "FFmpeg: Invalid data found when processing input",
    duration: "0:00",
    createdAt: "2026-10-08T10:45:00Z",
  },
];

export const MOCK_PROGRESS: Record<number, Progress> = {
  3: { stage: "processing", percent: 64 },
  5: { stage: "preparing", percent: 42 },
};

export const MOCK_MAX_QUALITY: Record<number, QualityLabel> = {
  1: "1080",
  2: "720",
};
