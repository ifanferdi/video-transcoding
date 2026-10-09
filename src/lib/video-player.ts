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

export function createPlayer(el: HTMLVideoElement, src: string): Player {
  const player = videojs(el, {
    controls: true,
    autoplay: false,
    preload: "auto",
    fluid: true,
    responsive: true,
    playbackRates: [0.5, 1, 1.5, 2],
    sources: [{ src, type: "application/x-m3u8" }],
  }) as QualityMenuPlayer;

  player.qualityMenu({ useResolutionLabels: true });

  return player;
}
