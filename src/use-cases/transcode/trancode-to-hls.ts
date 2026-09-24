import { RENDITION_LADDER, TranscodeOptions } from '@/domain/entities/types/transcode.types';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { generateMasterPlaylist } from './generate-master-playlist';
import { transcodeRendition } from './transcode-rendition';

// Arahkan fluent-ffmpeg ke binary FFmpeg yang sudah di-bundle oleh
// @ffmpeg-installer/ffmpeg, jadi tidak perlu install FFmpeg manual
// di sistem/container.
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Entry point utama: transcode source video ke semua rendition
 * secara SEQUENTIAL (satu per satu), lalu generate master playlist.
 *
 * Catatan: sengaja sequential (bukan Promise.all paralel) karena
 * FFmpeg transcoding itu CPU-bound berat. Menjalankan 4 rendition
 * sekaligus secara paralel di satu proses bisa membuat masing-masing
 * rendition justru lebih lambat (CPU contention) dan sulit dikontrol
 * resource-nya. Untuk paralelisme, lebih baik dilakukan di level
 * job/worker (misal 4 worker berbeda proses masing-masing 1 job),
 * bukan di dalam 1 job yang sama.
 */
export async function transcodeToHLS(options: TranscodeOptions): Promise<string> {
  const { inputPath, outputDir, segmentDuration = 6, onProgress } = options;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`File source tidak ditemukan: ${inputPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  let index = 0;
  for (const rendition of RENDITION_LADDER) {
    await transcodeRendition(inputPath, outputDir, rendition, segmentDuration, index, (percent) =>
      onProgress?.(rendition.name, percent),
    );

    index++;
  }

  generateMasterPlaylist(outputDir, RENDITION_LADDER);

  return path.join(outputDir, 'master.m3u8');
}
