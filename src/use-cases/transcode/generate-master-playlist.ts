import { RenditionConfig } from '@/domain/entities/types/transcode.types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate master.m3u8 — manifest utama yang berisi daftar
 * semua rendition. File inilah yang di-load pertama kali
 * oleh video.js/hls.js di client, lalu player memilih salah
 * satu (atau switch otomatis) berdasarkan kondisi bandwidth.
 */
export function generateMasterPlaylist(outputDir: string, renditions: RenditionConfig[]): void {
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
