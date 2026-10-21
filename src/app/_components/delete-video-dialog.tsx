"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { Video } from "@/domain/video.types";
import { deleteVideo, getApiErrorMessage } from "@/features/videos/api";

interface DeleteVideoDialogProps {
  video: Video;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteVideoDialog({
  video,
  onClose,
  onDeleted,
}: DeleteVideoDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteVideo(video.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setDeleting(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Delete video" className="max-w-md">
      <p className="mt-4 text-sm text-muted">
        <span className="text-foreground">{video.title}</span> and all of its
        transcoded files will be deleted permanently.
      </p>
      {error && <p className="mt-3 text-sm text-status-failed">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={confirm}
          disabled={deleting}
          className="font-semibold"
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Dialog>
  );
}
