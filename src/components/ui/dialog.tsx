"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/helper";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type RefObject } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Lebar panel, mis. `max-w-md`. */
  className?: string;
  /** Elemen yang difokuskan setelah dialog terbuka. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** `false` = dialog tidak bisa ditutup (X, backdrop, Escape), mis. saat proses berjalan. */
  dismissible?: boolean;
}

/**
 * Panel modal pakai `<dialog>` native: dapat focus trap, Escape, dan backdrop
 * tanpa listener tambahan. Padding di elemen dalam supaya klik di area panel
 * tidak dianggap klik backdrop.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  initialFocus,
  dismissible = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // `showModal` memfokuskan elemen pertama (tombol close), bukan input.
      initialFocus?.current?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialFocus]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // `cancel` = tombol Escape; dicegah selama dialog tidak boleh ditutup.
      onCancel={(event) => {
        if (!dismissible) event.preventDefault();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (dismissible && event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl border border-border bg-surface text-foreground shadow-2xl backdrop:bg-black/70",
        className,
      )}
    >
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            disabled={!dismissible}
          >
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
