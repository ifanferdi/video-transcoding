import { RenditionConfig } from '@/domain/entities/types/transcode.types';

import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Transcode 1 rendition (1 kualitas) dari source video ke HLS.
 * Menghasilkan: {outputDir}/{rendition.name}/playlist.m3u8 + segment*.ts
 */
export function transcodeRendition(
  inputPath: string,
  outputDir: string,
  rendition: RenditionConfig,
  segmentDuration: number,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const renditionDir = path.join(outputDir, rendition.name);
  fs.mkdirSync(renditionDir, { recursive: true });

  const playlistPath = path.join(renditionDir, 'playlist.m3u8');
  const segmentPath = path.join(renditionDir, 'segment%03d.ts');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // --- Video encoding settings ---
      .videoCodec('libx264') // codec H.264, paling universal untuk HLS
      .size(`${rendition.width}x${rendition.height}`) // resize resolusi
      .videoBitrate(rendition.videoBitrate)
      .outputOptions([
        `-maxrate ${rendition.maxrate}`, // batas atas bitrate (menghindari lonjakan)
        `-bufsize ${rendition.bufsize}`, // ukuran buffer VBV, kontrol konsistensi bitrate
        '-preset fast', // trade-off speed vs compression efficiency
        '-profile:v main', // H.264 profile, kompatibel luas di device
        '-g 48', // GOP size (keyframe interval), penting utk seeking di HLS
        '-sc_threshold 0', // disable scene-cut detection, keyframe konsisten per GOP
        '-keyint_min 48', // minimum keyframe interval, selaras dengan -g
      ])
      // --- Audio encoding settings ---
      .audioCodec('aac')
      .audioBitrate(rendition.audioBitrate)
      .audioChannels(2)
      // --- HLS-specific output settings ---
      .outputOptions([
        '-f hls', // format output: HLS
        `-hls_time ${segmentDuration}`, // durasi tiap segment .ts (detik)
        '-hls_playlist_type vod', // VOD = semua segment diketahui di awal (bukan live)
        '-hls_segment_type mpegts', // tipe segment: .ts (MPEG-TS)
        `-hls_segment_filename ${segmentPath}`, // pola nama file segment
      ])
      .output(playlistPath)
      // --- Event handlers ---
      .on('start', (cmd) => {
        console.log(`[${rendition.name}] Mulai transcoding`);
        console.log(`[${rendition.name}] Command: ${cmd}`);
      })
      .on('progress', (progress) => {
        // progress.percent kadang undefined di awal proses, jadi di-guard
        if (progress.percent && onProgress) {
          onProgress(Math.min(100, Math.round(progress.percent)));
        }
      })
      .on('error', (err) => {
        console.error(`[${rendition.name}] Error:`, err.message);
        reject(err);
      })
      .on('end', () => {
        console.log(`[${rendition.name}] Selesai`);
        resolve();
      })
      .run();
  });
}
