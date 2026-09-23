export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}


export function sourceKeyToOutputPrefix(sourceKey: string): string {
  // videos/source/2026/uuid.mp4 -> videos/output/uuid
  return sourceKey
    .replace(/^videos\/source\/\d{4}\//, 'videos/output/')
    .replace(/\.[^/.]+$/, ''); // hapus ekstensi file (.mp4)
}