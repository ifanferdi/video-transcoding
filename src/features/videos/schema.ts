import { z } from "zod";
import { UPLOAD_SINGLE_MAX_SIZE } from "@/config/config";

export const ACCEPTED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;

export const uploadSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.enum(ACCEPTED_CONTENT_TYPES),
  fileSize: z.number().int().positive().max(UPLOAD_SINGLE_MAX_SIZE),
});

export type UploadInput = z.infer<typeof uploadSchema>;
