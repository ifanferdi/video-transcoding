"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { IS_PRODUCTION, UPLOAD_KEY_TTL, UPLOAD_SECRET } from "@/config/config";
import { ListParams, PresignInput } from "@/features/videos/api";
import * as api from "@/features/videos/api";

const COOKIE_NAME = "write_session";
const MAX_KEY_LENGTH = 256;

/**
 * Bandingkan `key` dengan `UPLOAD_SECRET`.
 *
 * Di-hash dulu supaya kedua buffer sama panjang — `timingSafeEqual` menolak
 * panjang berbeda dan perbandingan langsung membocorkan panjang secret.
 * `UPLOAD_SECRET` belum di-set → selalu gagal (fail closed).
 */
function isValidKey(key: string): boolean {
  if (!UPLOAD_SECRET) return false;

  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(key), digest(UPLOAD_SECRET));
}

export async function unlockSession(key: unknown): Promise<{ ok: boolean }> {
  if (
    typeof key !== "string" ||
    key.length === 0 ||
    key.length > MAX_KEY_LENGTH
  ) {
    return { ok: false };
  }
  if (!isValidKey(key)) return { ok: false };

  const store = await cookies();
  store.set(COOKIE_NAME, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PRODUCTION,
    path: "/",
    maxAge: UPLOAD_KEY_TTL,
  });

  return { ok: true };
}

/** Status gate awal — cookie httpOnly tidak bisa dibaca dari browser. */
export async function isSessionUnlocked(): Promise<boolean> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value === "1";
}

export async function lockSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function listVideosAction(params: ListParams) {
  try {
    return api.listVideos(params);
  } catch (err) {
    throw err;
  }
}

export async function presignUploadAction(input: PresignInput) {
  try {
    return api.presignUpload(input);
  } catch (err) {
    throw err;
  }
}

export async function uploadCompleteAction(id: number) {
  try {
    return api.uploadComplete(id);
  } catch (err) {
    throw err;
  }
}
