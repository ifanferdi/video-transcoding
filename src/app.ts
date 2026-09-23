import bootstrap from '@/bootstrap';
import config from '@/config/config';
import 'dotenv/config';
import express, { Express } from 'express';
import * as http from 'http';

// Prisma BigInt (fileSize) → JSON serializable
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

const PORT = config.app.port || 8100;

(async () => {
  const app: Express = express();
  const httpServer = http.createServer(app);

  const closeResources = await bootstrap(app);
  console.log('✅  Success connected to all resources.');

  const server = httpServer.listen(PORT, () => console.log(`✅  Listening on port: ${PORT}`));

  const shutdown = async () => {
    console.log('Shutting down gracefully...');
    server.close(); // stop terima request baru
    await closeResources(); // tutup worker BullMQ + koneksi Redis
    process.exit(0);
  };

  process.on('SIGTERM', shutdown); // sinyal dari Docker/K8s saat stop container
  process.on('SIGINT', shutdown); // sinyal dari Ctrl+C waktu dev
})();
