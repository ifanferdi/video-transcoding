"use client";

import { UploadDialog } from "@/app/_components/upload-dialog";
import { VideoCard } from "@/app/_components/video-card";
import { VideoPlayerDialog } from "@/app/_components/video-player-dialog";
import type { Video } from "@/domain/video.types";
import { useVideoLibrary } from "@/hooks/use-video-library";
import { MOCK_MAX_QUALITY } from "@/mock/videos";
import { UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";

export default function Home() {
  const { videos, progress, addVideo } = useVideoLibrary();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          `<h1 className="text-xl font-bold tracking-tight text-foreground">VidFlow</h1>
          <p className="mt-1 text-sm text-muted">Upload & stream video with adaptive quality</p>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <UploadSimple size={18} weight="bold" />
          Upload
        </button>
      </header>

      <main className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            progress={progress[video.id]}
            maxQuality={MOCK_MAX_QUALITY[video.id]}
            onPlay={setPlaying}
          />
        ))}
      </main>

      {videos.length === 0 && (
        <div className="mt-24 text-center text-muted">No videos yet. Upload your first video.</div>
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} onUploaded={addVideo} />}

      {playing && <VideoPlayerDialog video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
