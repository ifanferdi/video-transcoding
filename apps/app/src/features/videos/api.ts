import type { ListResponse, PresignResponse, QualityLabel, Video } from "@/domain/video.types";
import { apiServer } from "@/lib/api-server";
import axios from "axios";

/** Parameter request GET /api/v1/videos */
export interface ListParams {
  page?: number;
  limit?: number;
  status?: Video["status"];
}

/** Body request POST /api/v1/videos/presign */
export interface PresignInput {
  filename: string;
  contentType: string;
  fileSize: number;
  /** Detik ke- frame yang dipakai jadi thumbnail. */
  thumbnailTimestamp: number;
}

/** Response DELETE /api/v1/videos/:id */
export interface DeleteResult {
  id: number;
  message: string;
}

export function getApiErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg) return msg;
  }
  return err instanceof Error ? err.message : "Something went wrong.";
}

export async function listVideos(params: ListParams = {}): Promise<ListResponse> {
  const { data } = await apiServer.get<ListResponse>("/api/v1/videos", {
    params,
  });

  return data;
}

export async function getVideo(id: number): Promise<Video> {
  const { data } = await apiServer.get<Video>(`/api/v1/videos/${id}`);

  return data;
}

export async function presignUpload(input: PresignInput): Promise<PresignResponse> {
  const { data } = await apiServer.post<PresignResponse>("/api/v1/videos/presign", {
    filename: input.filename,
    fileType: "video",
    contentType: input.contentType,
    fileSize: input.fileSize,
    thumbnailTimestamp: input.thumbnailTimestamp,
  });
  return data;
}

export async function putToPresign(
  presignUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  await apiServer.put(presignUrl, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress: (e) => {
      if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
}

export async function deleteVideo(id: number): Promise<DeleteResult> {
  const { data } = await apiServer.delete<DeleteResult>(`/api/v1/videos/${id}`);
  return data;
}

export async function uploadComplete(id: number): Promise<Video> {
  const { data } = await apiServer.post<Video>(`/api/v1/videos/${id}/complete`, {});
  return data;
}

export async function getMasterMaxQuality(masterUrl: string): Promise<QualityLabel | null> {
  const res = await fetch(masterUrl);
  const text = await res.text();
  let max = 0;
  for (const match of text.matchAll(/RESOLUTION=(\d{3,4})x(\d{3,4})/g)) {
    const height = Number(match[2]);
    if (height > max) max = height;
  }
  if (max >= 1080) return "1080";
  if (max >= 720) return "720";
  if (max >= 480) return "480";
  if (max >= 360) return "360";
  return null;
}
