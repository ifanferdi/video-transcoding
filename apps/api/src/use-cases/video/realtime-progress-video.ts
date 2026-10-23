import config from '@/config/config';
import { ProgressEvent } from '@/domain/entities/models/video';
import progressHub from '@/infrastructure/redis/progress-hub';
import sseRegistry from '@/infrastructure/sse/sse-registry';
import BaseUseCase from '@/use-cases/_base-use-case';
import e from 'express';

const PROGRESS_ACTIVE_KEY = config.redis.progressActiveKey;
const HEARTBEAT_MS = 30_000;

/**
 * Stream progres semua transcode yang sedang berjalan.
 * Koneksi bersifat general (tanpa id) dan tidak ditutup server;
 * client menerima snapshot job aktif saat connect, lalu event live.
 */
export default class RealtimeProgressVideo extends BaseUseCase {
  async execute({ res }: { res: e.Response }) {
    const send = (event: ProgressEvent | string) =>
      res.write(`data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`);

    // snapshot: job yang sedang berjalan saat client connect
    const active = await this.repositories.tools.redisRepository.hgetall(PROGRESS_ACTIVE_KEY);
    for (const value of Object.values(active)) send(value);

    const unsubscribe = await progressHub.subscribe((event) => send(event));
    const release = sseRegistry.add(res);

    // const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), HEARTBEAT_MS);

    res.on('close', () => {
      // clearInterval(heartbeat);
      unsubscribe();
      release();
    });
  }
}
