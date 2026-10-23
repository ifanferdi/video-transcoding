import { Response } from 'express';

/**
 * Lacak koneksi SSE aktif agar bisa ditutup rapi saat shutdown.
 * Tanpa ini `server.close()` menggantung menunggu stream yang tak pernah selesai.
 */
class SseRegistry {
  private clients = new Set<Response>();

  add(res: Response) {
    this.clients.add(res);
    return () => this.clients.delete(res);
  }

  closeAll() {
    for (const res of this.clients) res.end();
    this.clients.clear();
  }
}

export default new SseRegistry();
