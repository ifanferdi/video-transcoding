"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/helper";
import { useEffect, useRef, useState } from "react";

interface ThumbnailPickerProps {
  file: File;
  /** Detik ke- yang dipilih user — nilai yang dikirim ke API presign. */
  value: number;
  onChange: (seconds: number) => void;
}

/**
 * Pilih frame thumbnail dari file video lokal. Preview `<video>` di-seek
 * mengikuti slider, sehingga frame yang tampil = frame yang dikirim ke backend.
 * Fallback ke input detik manual kalau browser tidak bisa decode file-nya
 * (mis. .mkv di Safari/Firefox) atau durasinya tidak terbaca.
 */
export function ThumbnailPicker({ file, value, onChange }: ThumbnailPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [playable, setPlayable] = useState(true);
  const [url, setUrl] = useState<string | null>(null);

  // Dibuat di effect, bukan useMemo: render ganda StrictMode akan membuat blob URL yatim.
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- StrictMode-safe: only the committed URL is revoked
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const seek = (seconds: number) => {
    onChange(seconds);
    if (videoRef.current) videoRef.current.currentTime = seconds;
  };

  if (!playable) {
    return (
      <div className="mt-4">
        <label htmlFor="thumbnail-timestamp" className="text-sm font-medium text-foreground">
          Thumbnail at (seconds)
        </label>
        <p className="mt-1 text-xs text-muted">
          Preview unavailable for this file — enter the timestamp manually.
        </p>
        <Input
          id="thumbnail-timestamp"
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          className="mt-2"
        />
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-foreground">Thumbnail</p>
      <p className="mt-1 text-xs text-muted">Drag to pick the frame used as the video poster.</p>

      <video
        ref={videoRef}
        src={url ?? undefined}
        muted
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
          else setPlayable(false);
        }}
        onError={() => setPlayable(false)}
        className="mt-2 aspect-video w-full rounded-lg border border-border bg-black object-cover"
      />

      <div className="mt-3">
        <Slider
          value={[value]}
          min={0}
          max={Math.max(1, Math.floor(duration))}
          step={1}
          disabled={duration <= 0}
          onValueChange={(v) => seek(v[0])}
          aria-label="Thumbnail timestamp"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span className="font-medium text-foreground">{formatDuration(value)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}
