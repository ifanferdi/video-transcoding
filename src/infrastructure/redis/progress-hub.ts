import config from '@/config/config';
import { ProgressEvent } from '@/domain/entities/models/video';
import { RedisClient } from 'bun';
import { CreateRedisConnection } from './redis-connection';

type Listener = (event: ProgressEvent) => void;

/**
 * Fan-out satu subscriber Redis untuk semua koneksi SSE.
 * Menghindari satu koneksi Redis per client — subscriber tunggal
 * meneruskan event ke seluruh listener in-process.
 */
class ProgressHub {
  private listeners = new Set<Listener>();
  private subscriber: RedisClient | null = null;
  private connecting: Promise<void> | null = null;

  async subscribe(listener: Listener): Promise<() => void> {
    await this.ensureSubscriber();
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  async close() {
    this.listeners.clear();
    if (!this.subscriber) return;

    await this.subscriber.unsubscribe(config.redis.progressChannelPrefix);
    this.subscriber.close();
    this.subscriber = null;
    this.connecting = null;
  }

  private async ensureSubscriber() {
    if (this.subscriber) return;

    this.connecting ??= (async () => {
      const subscriber = CreateRedisConnection();
      await subscriber.connect();
      await subscriber.subscribe(config.redis.progressChannelPrefix, (message) => {
        const event = JSON.parse(message) as ProgressEvent;
        for (const listener of this.listeners) listener(event);
      });
      this.subscriber = subscriber;
    })();

    await this.connecting;
  }
}

export default new ProgressHub();
