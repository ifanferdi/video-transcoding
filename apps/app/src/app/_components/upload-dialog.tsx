"use client";

import { ThumbnailPicker } from "@/app/_components/thumbnail-picker";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { UPLOAD_SINGLE_MAX_SIZE } from "@/config/config";
import { presignUploadAction, uploadCompleteAction } from "@/features/videos/action";
import { getApiErrorMessage, putToPresign } from "@/features/videos/api";
import { ACCEPTED_CONTENT_TYPES, uploadSchema } from "@/features/videos/schema";
import { formatBytes } from "@/lib/helper";
import { CloudUpload, FileVideo } from "lucide-react";
import { useRef, useState } from "react";

interface UploadDialogProps {
  onClose: () => void;
  onUploaded: () => void;
}

type Step = "idle" | "selected" | "uploading";

export function UploadDialog({ onClose, onUploaded }: UploadDialogProps) {
  const [step, setStep] = useState<Step>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [thumbnailTimestamp, setThumbnailTimestamp] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (selected: File | null | undefined) => {
    if (!selected) return;
    const result = uploadSchema.safeParse({
      filename: selected.name,
      contentType: selected.type,
      fileSize: selected.size,
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(
        issue.path[0] === "fileSize"
          ? `File exceeds the ${formatBytes(UPLOAD_SINGLE_MAX_SIZE)} limit for single upload.`
          : "Unsupported format. Use MP4, WebM, QuickTime, or Matroska.",
      );
      setStep("idle");
      setFile(null);
      setThumbnailTimestamp(0);
      return;
    }
    setError(null);
    setFile(selected);
    setThumbnailTimestamp(0);
    setStep("selected");
  };

  const startUpload = async () => {
    if (!file) return;
    const parsed = uploadSchema.safeParse({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
      thumbnailTimestamp,
    });
    if (!parsed.success) {
      setError("Invalid thumbnail timestamp.");
      return;
    }
    setStep("uploading");
    setPercent(0);
    setError(null);
    try {
      const presign = await presignUploadAction({
        filename: file.name,
        contentType: file.type,
        fileSize: file.size,
        thumbnailTimestamp: parsed.data.thumbnailTimestamp,
      });

      await putToPresign(presign.upload.presignUrl, file, (percent) => setPercent(percent));

      await uploadCompleteAction(presign.id);
      onUploaded();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStep("selected");
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Upload video"
      className="max-w-md"
      dismissible={step !== "uploading"}
    >
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
            className="mt-5 flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface-hover/50 px-6 py-12 text-center transition-colors hover:border-muted cursor-pointer"
          >
            <CloudUpload size={40} strokeWidth={1.5} className="text-muted" />
            <div>
              <p className="text-sm font-medium text-foreground">Drag & drop your video</p>
              <p className="mt-1 text-xs text-muted">
                or click to browse — MP4, WebM, QuickTime, Matroska · up to{" "}
                {formatBytes(UPLOAD_SINGLE_MAX_SIZE)}
              </p>
            </div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_CONTENT_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {error && <p className="mt-3 text-sm text-status-failed-text">{error}</p>}
        </>
      )}

      {step === "selected" && file && (
        <div className="mt-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-hover/50 p-3">
            <FileVideo size={28} strokeWidth={1.5} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted">{formatBytes(file.size)}</p>
            </div>
          </div>

          <ThumbnailPicker
            file={file}
            value={thumbnailTimestamp}
            onChange={setThumbnailTimestamp}
          />

          {error && <p className="mt-3 text-sm text-status-failed-text">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={startUpload} className="font-semibold">
              Upload
            </Button>
          </div>
        </div>
      )}

      {step === "uploading" && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">Uploading…</span>
            <span className="font-medium text-foreground">{Math.round(percent)}%</span>
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
    </Dialog>
  );
}
