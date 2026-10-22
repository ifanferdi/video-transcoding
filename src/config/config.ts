/** Origin backend. Wajib `NEXT_PUBLIC_*` karena dipakai dari browser. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8100";

/** Batas ukuran upload single-part (500MB). */
export const UPLOAD_SINGLE_MAX_SIZE = 500 * 1024 * 1024;

// --- server-only ---

/** Secret gate fitur tulis; kosong → gate selalu terkunci (fail closed). */
export const UPLOAD_SECRET = process.env.UPLOAD_SECRET || "";

/** TTL cookie gate dalam detik; kosong/invalid → 1 jam. */
export const UPLOAD_KEY_TTL = Number(process.env.UPLOAD_KEY_TTL || 3600) || 3600;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// --- profil pembuat ---

/** Profil pembuat, tampil di dialog About. Wajib `NEXT_PUBLIC_*` karena dibaca dari browser. */
export const profile = {
  fullName: process.env.NEXT_PUBLIC_PROFILE_FULL_NAME ?? "",
  email: process.env.NEXT_PUBLIC_PROFILE_EMAIL ?? "",
  role: process.env.NEXT_PUBLIC_PROFILE_ROLE ?? "",
  location: process.env.NEXT_PUBLIC_PROFILE_LOCATION ?? "",
  /** Foto profil, file statis di `public/`. */
  avatarUrl: "/avatar.jpg",
  social: {
    github: process.env.NEXT_PUBLIC_PROFILE_GITHUB ?? "",
    linkedin: process.env.NEXT_PUBLIC_PROFILE_LINKEDIN ?? "",
    instagram: process.env.NEXT_PUBLIC_PROFILE_INSTAGRAM ?? "",
    website: process.env.NEXT_PUBLIC_PROFILE_WEBSITE ?? "",
  },
};
