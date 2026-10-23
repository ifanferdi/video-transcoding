export interface TechStackGroup {
  category: string;
  items: string[];
}

/** Penjelasan singkat apa ini aplikasinya. Tampil di dialog About, di atas tech stack. */
export const projectIntro =
  "A video upload and adaptive streaming platform. Files are uploaded straight to S3-compatible storage through presigned URLs — they never pass through the API server. A queue worker transcodes each video into an HLS ladder from 144p to 1080p, capped to the source resolution so nothing is upscaled. Playback then streams with adaptive bitrate: quality follows the viewer's connection, or can be picked manually.";

/** Kelompok teknologi yang dipakai project ini. Tampil di dialog About. */
export const techStack: TechStackGroup[] = [
  {
    category: "Frontend",
    items: [
      "Next.js 16",
      "React 19",
      "TypeScript",
      "Tailwind v4",
      "TanStack Query",
      "Server-Sent Events",
    ],
  },
  { category: "Media", items: ["VideoJS", "HLS", "FFmpeg", "S3 Presigned URL"] },
  {
    category: "Backend",
    items: ["Bun", "Express 4", "Prisma 7", "PostgreSQL", "BullMQ", "Redis", "Redis Pub/Sub"],
  },
];
