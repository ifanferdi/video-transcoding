import moment from "moment";

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = value >= 100 || unit === 0 ? 0 : 1;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function formatDuration(totalSeconds: number): string {
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const mmss = moment.utc(total * 1000).format("mm:ss");
  // Jam dihitung manual karena format("HH") moment membungkus di 24 jam.
  return hours > 0 ? `${String(hours).padStart(2, "0")}:${mmss}` : mmss;
}

export function formatDate(iso: string): string {
  return moment(iso).format("MMM D");
}
