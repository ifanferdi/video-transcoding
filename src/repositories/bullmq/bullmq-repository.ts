import { CreateRedisConnection } from '@/infrastructure/redis/redis-connection';
import { createBunRedisClient, JobProgress, Processor, Queue, Worker } from 'bullmq';
import * as os from 'os';

interface SubscribeJobOptions {
  /**
   * Jumlah job yang diproses paralel (worker pool).
   * Default: jumlah CPU - 1, sisakan 1 core untuk API & OS.
   */
  concurrency?: number;
}

export default class BullMqRepository {
  private queues = new Map<string, Queue>();
  private workers: Worker[] = [];
  private closing = false;

  constructor(protected readonly connection = createBunRedisClient(CreateRedisConnection())) {}

  publishJob = async (
    queue: string,
    data: Record<string, any>,
    delay = 0 /** miliseconds */,
    removeOnComplete = true,
    removeOnFail = true,
  ) => {
    const q = this.getQueue(queue);

    return q.add('transcode', data, {
      delay,
      removeOnComplete,
      removeOnFail,
    });
  };

  subscribeJob = (
    queue: string,
    callback: Processor<any, any, any, JobProgress>,
    options?: SubscribeJobOptions,
  ) => {
    const concurrency = options?.concurrency ?? Math.max(1, os.cpus().length - 1);

    const worker = new Worker(queue, callback, { connection: this.connection, concurrency });
    this.workers.push(worker);

    return worker;
  };

  /**
   * Graceful shutdown:
   * 1. Worker berhenti ambil job baru & tunggu job aktif selesai (timeout default BullMQ)
   * 2. Tutup semua instance Queue
   * 3. Tutup koneksi Redis bersama (owner-nya repo ini, bukan BullMQ)
   */
  async close() {
    if (this.closing) return;
    this.closing = true;

    await Promise.allSettled(this.workers.map((worker) => worker.close()));
    await Promise.allSettled([...this.queues.values()].map((queue) => queue.close()));

    this.workers = [];
    this.queues.clear();

    try {
      await this.connection.quit();
    } catch {
      // koneksi mungkin sudah tertutup — abaikan
    }
  }

  /**
   * Cache instance Queue per nama — hindari membuat instance baru
   * per publish (memory leak listener + state BullMQ).
   */
  getQueue(queue: string) {
    let instance = this.queues.get(queue);
    if (!instance) {
      instance = new Queue(queue, { connection: this.connection });
      this.queues.set(queue, instance);
    }

    return instance;
  }
}
