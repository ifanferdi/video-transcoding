import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import "videojs-contrib-quality-menu/dist/videojs-contrib-quality-menu.css";
import "videojs-contrib-quality-menu";

interface QualityMenuOptions {
  sdBitrateLimit?: number;
  useResolutionLabels?: boolean;
  resolutionLabelBitrates?: boolean | Record<string, number>;
  defaultResolution?: string;
}

type QualityMenuPlayer = Player & {
  qualityMenu(options?: QualityMenuOptions): void;
};

/**
 * Buat player video.js di dalam `container` (elemen React yang kosong).
 *
 * Elemen `<video>` dibuat manual, bukan lewat JSX: `dispose()` video.js
 * menghapus DOM node yang di-ingest-nya, jadi kalau React yang memiliki node
 * itu, init berikutnya (StrictMode dev / ganti source) jalan di elemen yang
 * sudah lepas dari DOM → warning "element supplied is not included in the DOM".
 */
export function createPlayer(container: HTMLElement, src: string): Player {
  const el = document.createElement("video");
  el.className = "video-js vjs-big-play-centered";
  el.playsInline = true;
  container.appendChild(el);

  const player = videojs(el, {
    controls: true,
    autoplay: true,
    preload: "auto",
    fluid: true,
    responsive: true,
    playbackRates: [0.5, 1, 1.5, 2],
    // VHS hanya mengenali MIME `mpegurl` (`x-mpegurl`/`vnd.apple.mpegurl`), bukan `x-m3u8`.
    sources: [{ src, type: "application/x-mpegURL" }],
  }) as QualityMenuPlayer;

  player.qualityMenu({ useResolutionLabels: true });

  return player;
}
