"use client";

import { useEffect, useRef, useState } from "react";
import { CloudArrowUp, FileVideo, X } from "@phosphor-icons/react";
import { formatBytes } from "@/lib/format";

const ACCEPTED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];
const MAX_SIZE = 500 * 1024 * 1024;
const UPLOAD_MS = 2200;

interface UploadDialogProps {
  onClose: () => void;
  onUploaded: (title: string, fileSize: number) => void;
}

type Step = "idle" | "selected" | "uploading";

export function UploadDialog({ onClose, onUploaded }: UploadDialogProps) {
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadTimer = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (uploadTimer.current != null)
        window.clearInterval(uploadTimer.current);
    };
  }, []);

  const handleFile = (selected: File | null | undefined) => {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Unsupported format. Use MP4, WebM, QuickTime, or Matroska.");
      setStep("idle");
      setFile(null);
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError("File exceeds the 500 MB limit for single upload.");
      setStep("idle");
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
    setStep("selected");
  };

  const startUpload = () => {
    if (!file) return;
    setStep("uploading");
    setPercent(0);
    const start = Date.now();
    uploadTimer.current = window.setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / UPLOAD_MS);
      setPercent(p * 100);
      if (p >= 1) {
        window.clearInterval(uploadTimer.current!);
        uploadTimer.current = null;
        onUploaded(file.name, file.size);
        onClose();
      }
    }, 60);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Upload video
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>

        {step === "idle" && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-hover/50 px-6 py-12 text-center transition-colors hover:border-muted"
            >
              <CloudArrowUp size={40} weight="light" className="text-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Drag & drop your video
                </p>
                <p className="mt-1 text-xs text-muted">
                  or click to browse — MP4, WebM, QuickTime, Matroska · up to
                  500 MB
                </p>
              </div>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {error && (
              <p className="mt-3 text-sm text-status-failed">{error}</p>
            )}
          </>
        )}

        {step === "selected" && file && (
          <div className="mt-5">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover/50 p-3">
              <FileVideo
                size={28}
                weight="light"
                className="shrink-0 text-muted"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted">{formatBytes(file.size)}</p>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startUpload}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Upload
              </button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground">Uploading…</span>
              <span className="font-medium text-foreground">
                {Math.round(percent)}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-100"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-2 truncate text-xs text-muted">{file?.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
