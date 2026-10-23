import { isSessionUnlocked } from "@/features/videos/action";
import { listVideos } from "@/features/videos/api";
import { Suspense } from "react";
import { VideoLibrary } from "./_components/video-library";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[108rem] px-4 py-8 sm:px-6">
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryData />
      </Suspense>
    </div>
  );
}

/**
 * Ambil data awal di server (list + status gate) supaya HTML pertama sudah
 * berisi. Setelah itu client yang urus refetch lewat TanStack Query.
 */
async function LibraryData() {
  const [initialData, initialUnlocked] = await Promise.all([
    // Backend mati → biar client yang tampilkan state error + retry.
    listVideos({ limit: -1 }).catch(() => undefined),
    isSessionUnlocked(),
  ]);

  return <VideoLibrary initialData={initialData} initialUnlocked={initialUnlocked} />;
}

function LibrarySkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading videos"
      className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div
          key={i}
          className="aspect-4/3 animate-pulse rounded-xl border border-border bg-surface"
        />
      ))}
    </div>
  );
}
