"use client";

import { Dialog } from "@/components/ui/dialog";
import { projectIntro, techStack } from "@/config/about";
import { profile } from "@/config/config";
import { Mail } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AboutDialogProps {
  onClose: () => void;
}

/**
 * Hanya link yang terisi yang dirender — yang kosong disembunyikan, bukan
 * dinonaktifkan. Label teks, bukan ikon: lucide sudah tidak memuat brand icon.
 */
const socials = [
  { key: "github", label: "GitHub", url: profile.social.github },
  { key: "linkedin", label: "LinkedIn", url: profile.social.linkedin },
  { key: "instagram", label: "Instagram", url: profile.social.instagram },
  { key: "website", label: "Website", url: profile.social.website },
].filter((social) => social.url);

const filledGroups = techStack.filter((group) => group.items.length > 0);

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [avatarFailed, setAvatarFailed] = useState(false);
  const initials = profile.fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open onClose={onClose} title="About" className="max-w-2xl">
      <div className="mt-5 max-h-[70vh] space-y-6 overflow-y-auto pr-1">
        <section className="flex items-center gap-4">
          {avatarFailed ? (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-foreground">
              {initials || "?"}
            </div>
          ) : (
            <Image
              src={profile.avatarUrl}
              alt=""
              width={64}
              height={64}
              onError={() => setAvatarFailed(true)}
              className="size-16 shrink-0 rounded-full bg-surface-hover object-cover"
            />
          )}

          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">{profile.fullName || "—"}</h3>
            {(profile.role || profile.location) && (
              <p className="mt-0.5 text-sm text-muted">
                {[profile.role, profile.location].filter(Boolean).join(" · ")}
              </p>
            )}
            {profile.email && (
              <a
                href={`mailto:${profile.email}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
              >
                <Mail size={14} />
                {profile.email}
              </a>
            )}
          </div>
        </section>

        {socials.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {socials.map((social) => (
              <a
                key={social.key}
                href={social.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-muted hover:text-foreground"
              >
                {social.label}
              </a>
            ))}
          </div>
        )}

        <section className="border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-foreground">About this project</h4>
          <p className="mt-2 text-sm leading-relaxed text-muted">{projectIntro}</p>
        </section>

        <section className="border-t border-border pt-5">
          <h4 className="text-sm font-semibold text-foreground">Tech stack</h4>
          <div className="mt-3 space-y-3">
            {filledGroups.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  {group.category}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-border bg-surface-hover/50 px-2.5 py-1 text-xs text-foreground"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
