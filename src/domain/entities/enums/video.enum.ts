export enum VideoStatus {
  UPLOADING = 'uploading', // presigned URL dibuat, menunggu upload client selesai
  QUEUED = 'queued', // upload selesai, job masuk antrian RabbitMQ
  PROCESSING = 'processing', // worker sedang transcode
  READY = 'ready', // semua rendition selesai
  FAILED = 'failed', // transcoding gagal
}

export const ALL_VIDEO_STATUSES = Object.values(VideoStatus);

export enum RenditionQuality {
  P1080 = '1080p',
  P720 = '720p',
  P480 = '480p',
  P360 = '360p',
}

export enum VideoRelation {}
