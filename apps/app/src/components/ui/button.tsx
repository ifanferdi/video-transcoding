import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/helper";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "icon" | "icon-lg";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  outline: "border border-border text-foreground hover:bg-white/5",
  ghost: "text-muted hover:bg-white/5 hover:text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  icon: "p-1.5",
  "icon-lg": "p-2",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}
