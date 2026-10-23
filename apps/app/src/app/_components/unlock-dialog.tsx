"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { unlockSession } from "@/features/videos/action";
import { useRef, useState, type FormEvent } from "react";

interface UnlockDialogProps {
  onClose: () => void;
  onUnlocked: () => void;
}

export function UnlockDialog({ onClose, onUnlocked }: UnlockDialogProps) {
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { ok } = await unlockSession(key);
    if (!ok) {
      setError("Invalid key.");
      setPending(false);
      return;
    }

    onUnlocked();
    onClose();
  };

  return (
    <Dialog open onClose={onClose} title="Unlock" className="max-w-md" initialFocus={inputRef}>
      <form onSubmit={submit} className="mt-4">
        <p className="text-sm text-muted">Enter the key to enable uploading and deleting videos.</p>
        <p className="mt-2 text-xs text-muted">
          Need the key? Contact the <strong>admin</strong> to request access to all features.
        </p>
        <Input
          ref={inputRef}
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={pending}
          aria-label="Unlock key"
          className="mt-3"
        />
        {error && <p className="mt-3 text-sm text-status-failed-text">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending} className="font-semibold">
            {pending ? "Unlocking…" : "Unlock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
