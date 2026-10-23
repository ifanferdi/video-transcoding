import { cn } from "@/lib/helper";
import type { ComponentProps } from "react";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-lg border border-border bg-surface-hover/50 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-muted disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    />
  );
}
