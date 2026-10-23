"use client";

import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { Dialog } from "@/components/ui/dialog";
import { projectIntro, techStack } from "@/config/about";
import { profile } from "@/config/config";
import { Globe, Mail } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface AboutDialogProps {
  onClose: () => void;
}

/** Hanya link yang terisi yang dirender — yang kosong disembunyikan, bukan dinonaktifkan. */
const socials = [
  { key: "github", label: "GitHub", url: profile.social.github, icon: <GithubIcon size={15} /> },
  {
    key: "linkedin",
    label: "LinkedIn",
    url: profile.social.linkedin,
    icon: <LinkedinIcon size={15} />,
  },
  {
    key: "instagram",
    label: "Instagram",
    url: profile.social.instagram,
    icon: <InstagramIcon size={15} />,
  },
  { key: "website", label: "Website", url: profile.social.website, icon: <Globe size={15} /> },
].filter((social) => social.url);

/**
 * Tombol link keluar. Sengaja dibedakan dari chip tech stack di bawah: bentuknya
 * `rounded-lg` + ada shadow saat diam, sedangkan chip `rounded-full` tanpa shadow —
 * supaya sekilas kelihatan mana yang bisa diklik dan mana yang sekadar label.
 */
const socialClass = [
  "inline-flex items-center gap-2 rounded-lg border border-border bg-surface-hover px-3.5 py-2",
  "text-xs font-medium text-foreground shadow-sm",
  "transition-[background-color,border-color,transform,box-shadow] duration-200 ease-out",
  "hover:border-accent hover:bg-accent hover:shadow-lg hover:shadow-accent/30",
  "active:translate-y-0 active:scale-[0.97]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "motion-reduce:transform-none",
].join(" ");

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
                className={socialClass}
              >
                {social.icon}
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
