"use client";

import { Button } from "@/components/ui/button";
import type { ListResponse, Video } from "@/domain/video.types";
import { listVideosAction, lockSession } from "@/features/videos/action";
import { getApiErrorMessage } from "@/features/videos/api";
import { useProgress } from "@/hooks/use-progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen, Upload, UserRound } from "lucide-react";
import { useState } from "react";
import { AboutDialog } from "./about-dialog";
import { DeleteVideoDialog } from "./delete-video-dialog";
import { UnlockDialog } from "./unlock-dialog";
import { UploadDialog } from "./upload-dialog";
import { VideoCard } from "./video-card";
import { VideoPlayerDialog } from "./video-player-dialog";

interface VideoLibraryProps {
  /** Data awal hasil fetch server; `undefined` kalau gagal (client retry sendiri). */
  initialData?: ListResponse;
  initialUnlocked: boolean;
}

/**
 * Bagian interaktif library: gate lock/unlock, dialog upload & delete, progress
 * SSE. Data awal datang dari server component supaya render pertama sudah berisi.
 */
export function VideoLibrary({ initialData, initialUnlocked }: VideoLibraryProps) {
  const queryClient = useQueryClient();
  const listQuery = useQuery({
    queryKey: ["videos"],
    queryFn: () => listVideosAction({ limit: -1 }),
    initialData,
  });

  const videos = listQuery.data?.data ?? [];

  const progress = useProgress(videos);

  const [unlocked, setUnlocked] = useState(initialUnlocked);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<Video | null>(null);

  const classHeaderButton =
    "transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out bg-surface-hover";

  const refetchList = () => queryClient.invalidateQueries({ queryKey: ["videos"] });

  const lock = async () => {
    await lockSession();
    setUnlocked(false);
    setUploadOpen(false);
    setDeleting(null);
  };

  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Video Apps</h1>
          <p className="mt-1 text-sm text-muted">Upload & stream video with adaptive quality</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" className={classHeaderButton} onClick={() => setAboutOpen(true)}>
            <UserRound size={18} />
            About
          </Button>
          {unlocked && (
            <Button type="button" onClick={() => setUploadOpen(true)} className="font-semibold">
              <Upload size={18} strokeWidth={2.5} />
              Upload
            </Button>
          )}
          {unlocked ? (
            <Button
              type="button"
              variant="outline"
              onClick={lock}
              aria-label="Lock upload and delete"
            >
              <Lock size={18} />
              Lock
            </Button>
          ) : (
            <Button type="button" className={classHeaderButton} onClick={() => setUnlockOpen(true)}>
              <LockOpen size={18} />
              Unlock
            </Button>
          )}
        </div>
      </header>

      {listQuery.isLoading && (
        <div className="mt-24 text-center text-sm text-muted">Loading videos…</div>
      )}
      {listQuery.isError && (
        <div className="mt-24 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-status-failed-text">
            Failed to load videos. Is the API running?
          </p>
          <p className="text-xs text-muted">{getApiErrorMessage(listQuery.error)}</p>
          <Button type="button" variant="outline" onClick={() => listQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}

      {!listQuery.isLoading && !listQuery.isError && (
        <main className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              progress={progress[video.id]}
              onPlay={setPlaying}
              onDelete={unlocked ? setDeleting : undefined}
            />
          ))}
        </main>
      )}

      {!listQuery.isLoading && !listQuery.isError && videos.length === 0 && (
        <div className="mt-24 text-center text-muted">No videos yet. Upload your first video.</div>
      )}

      {unlockOpen && (
        <UnlockDialog onClose={() => setUnlockOpen(false)} onUnlocked={() => setUnlocked(true)} />
      )}

      {uploadOpen && <UploadDialog onClose={() => setUploadOpen(false)} onUploaded={refetchList} />}

      {deleting && (
        <DeleteVideoDialog
          video={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={refetchList}
        />
      )}

      {playing && <VideoPlayerDialog video={playing} onClose={() => setPlaying(null)} />}

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </>
  );
}
