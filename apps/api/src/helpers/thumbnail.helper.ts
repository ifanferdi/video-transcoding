/**
 * ============================================================
 * THUMBNAIL GENERATOR
 * ============================================================
 * Generate 1 gambar thumbnail dari video source pada timestamp
 * tertentu (detik ke berapa), diminta oleh client saat request
 * upload (misal user pilih frame mana yang mau jadi thumbnail).
 *
 * Dependencies: sama seperti transcode-hls.ts (fluent-ffmpeg)
 * ============================================================
 */

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ThumbnailOptions {
  inputPath: string; // path video source lokal
  outputPath: string; // path lengkap file thumbnail output (misal .../thumbnail.jpg)
  timestampSeconds: number; // detik ke berapa, dikirim dari client via queue payload
  width?: number; // lebar thumbnail, tinggi mengikuti aspect ratio asli
}

/**
 * Generate 1 thumbnail dari video pada detik tertentu.
 *
 * Pakai .seekInput() (seek SEBELUM -i diproses), bukan .seek()
 * biasa — ini penting untuk performa: FFmpeg bisa lompat langsung
 * ke posisi tersebut tanpa decode seluruh frame dari awal file,
 * jauh lebih cepat terutama untuk video yang panjang/berukuran besar.
 */
export function generateThumbnail(options: ThumbnailOptions): Promise<void> {
  const { inputPath, outputPath, timestampSeconds, width = 640 } = options;

  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    ffmpeg(inputPath)
      .seekInput(timestampSeconds)
      .frames(1) // ambil 1 frame saja
      .outputOptions([
        `-vf scale=${width}:-1`, // resize, tinggi otomatis mengikuti aspect ratio
        '-q:v 2', // kualitas JPEG (1=terbaik, 31=terburuk)
      ])
      .output(outputPath)
      .on('start', (cmd) => console.log(`[thumbnail] Generating thumbnail: ${outputPath}`))
      .on('end', () => {
        console.log(`[thumbnail] Selesai: ${outputPath}`);
        resolve();
      })
      .on('error', (err) => {
        console.error('[thumbnail] Error:', err.message);
        reject(err);
      })
      .run();
  });
}

/**
 * Validasi timestamp yang diminta client terhadap durasi video asli.
 * Perlu dipanggil sebelum generateThumbnail(), karena client bisa saja
 * kirim timestamp yang melebihi durasi video (misal video 10 detik,
 * client minta detik ke-60) — FFmpeg akan gagal atau hasilkan frame
 * terakhir yang tidak sesuai ekspektasi kalau tidak divalidasi dulu.
 */
export function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration ?? 0);
    });
  });
}

/**
 * Baca resolusi video source (stream video pertama) via ffprobe.
 * Dipakai untuk memilih rendition ladder — jangan transcode ke
 * resolusi lebih besar dari source (upscaling).
 */
export function getVideoDimensions(inputPath: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find((s) => s.codec_type === 'video');
      resolve({ width: videoStream?.width ?? 0, height: videoStream?.height ?? 0 });
    });
  });
}

/**
 * Clamp timestamp yang diminta client supaya tidak melebihi durasi
 * video, dengan sedikit margin dari ujung akhir (video kadang tidak
 * punya frame valid persis di detik terakhir).
 */
export function clampTimestamp(requested: number, duration: number): number {
  const safeMargin = 0.5; // detik
  const maxAllowed = Math.max(0, duration - safeMargin);
  return Math.min(Math.max(0, requested), maxAllowed);
}
