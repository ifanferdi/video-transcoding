import {
  RENDITION_LADDER,
  RenditionConfig,
  TranscodeOptions,
} from '@/domain/entities/types/transcode.types';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { transcodeRendition } from './_transcode-rendition';

// Arahkan fluent-ffmpeg ke binary FFmpeg yang sudah di-bundle oleh
// @ffmpeg-installer/ffmpeg, jadi tidak perlu install FFmpeg manual
// di sistem/container.
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Entry point utama: transcode source video ke semua rendition
 * secara SEQUENTIAL (satu per satu), lalu generate master playlist.
 *
 * Catatan: sengaja sequential (bukan Promise.all paralel) karena
 * FFmpeg transcoding itu CPU-bound berat. Menjalankan semua rendition
 * sekaligus secara paralel di satu proses bisa membuat masing-masing
 * rendition justru lebih lambat (CPU contention) dan sulit dikontrol
 * resource-nya. Untuk paralelisme, lebih baik dilakukan di level
 * job/worker (misal 4 worker berbeda proses masing-masing 1 job),
 * bukan di dalam 1 job yang sama.
 */
export async function transcodeToHLS(options: TranscodeOptions): Promise<string> {
  const {
    inputPath,
    outputDir,
    segmentDuration = 6,
    onProgress,
    renditions = RENDITION_LADDER,
  } = options;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`File source tidak ditemukan: ${inputPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const rendition of renditions)
    await transcodeRendition(inputPath, outputDir, rendition, segmentDuration, (percent) =>
      onProgress?.(rendition.name, percent),
    );

  generateMasterPlaylist(outputDir, renditions);

  return path.join(outputDir, 'master.m3u8');
}

/**
 * Generate master.m3u8 — manifest utama yang berisi daftar
 * semua rendition. File inilah yang di-load pertama kali
 * oleh video.js/hls.js di client, lalu player memilih salah
 * satu (atau switch otomatis) berdasarkan kondisi bandwidth.
 */
function generateMasterPlaylist(outputDir: string, renditions: RenditionConfig[]): void {
  const lines: string[] = ['#EXTM3U', '#EXT-X-VERSION:3'];

  for (const r of renditions) {
    // Bandwidth dalam bit per second, dihitung dari video+audio bitrate
    const videoKbps = parseInt(r.videoBitrate.replace('k', ''), 10);
    const audioKbps = parseInt(r.audioBitrate.replace('k', ''), 10);
    const bandwidth = (videoKbps + audioKbps) * 1000;

    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${r.width}x${r.height}`);
    lines.push(`${r.name}/playlist.m3u8`);
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, lines.join('\n'));
  console.log(`Master playlist dibuat: ${masterPath}`);
}
