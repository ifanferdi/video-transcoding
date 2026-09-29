/**
 * Definisi 1 level kualitas (rendition) dalam HLS ladder.
 */
export interface RenditionConfig {
  name: string; // label folder output, misal "720p"
  width: number; // lebar output video
  height: number; // tinggi output video
  videoBitrate: string; // bitrate video, misal "2800k"
  audioBitrate: string; // bitrate audio, misal "128k"
  maxrate: string; // batas atas bitrate (untuk VBV buffer)
  bufsize: string; // ukuran buffer VBV
}

export interface TranscodeOptions {
  inputPath: string; // path file source (hasil download dari S3)
  outputDir: string; // folder tujuan hasil transcoding
  segmentDuration?: number; // durasi tiap segment .ts (detik), default 6
  onProgress?: (rendition: string, percent: number) => void;
}

export interface TranscodeJobPayload {
  id: number;
  sourceKey: string;
  outputPrefix: string;
  thumbnailTimestamp: number;
  deleteSourceAfterDone?: boolean;
}

export enum TrancodingStatus {
  PREPARING = 'preparing',
  PROCESSING = 'processing',
  FINISHING = 'finishing',
}

export interface JobProgressCallback {
  (status: TrancodingStatus, percent: number): void;
}

/**
 * Rendition ladder default — 4 level kualitas.
 * Bitrate ini adalah rule of thumb, sesuaikan dengan
 * karakteristik konten (video aksi cepat butuh bitrate
 * lebih tinggi dibanding video statis/talking head).
 */
export const RENDITION_LADDER: RenditionConfig[] = [
  {
    name: '1080p',
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '192k',
    maxrate: '5350k',
    bufsize: '7500k',
  },
  {
    name: '720p',
    width: 1280,
    height: 720,
    videoBitrate: '2800k',
    audioBitrate: '128k',
    maxrate: '2996k',
    bufsize: '4200k',
  },
  {
    name: '480p',
    width: 854,
    height: 480,
    videoBitrate: '1400k',
    audioBitrate: '128k',
    maxrate: '1498k',
    bufsize: '2100k',
  },
  {
    name: '360p',
    width: 640,
    height: 360,
    videoBitrate: '800k',
    audioBitrate: '96k',
    maxrate: '856k',
    bufsize: '1200k',
  },
];
