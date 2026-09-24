import config from '@/config/config';
import { ProgressEvent } from '@/domain/entities/models/video';
import { TrancodingStatus } from '@/domain/entities/types/transcode.types';
import { channelName } from '@/helpers/common.helper';
import BaseUseCase from '@/use-cases/_base-use-case';
import e from 'express';

const SNAPSHOT_KEY = config.redis.snapshotKey;

interface logRealtimeValue {
  status: TrancodingStatus;
  percent: number;
}
export default class RealtimeProgressVideo extends BaseUseCase {
  async execute({ res, id }: { res: e.Response; id: number }) {
    const sendEvent = (event: string) => res.write(`data: ${event}`);

    const subscriber = await this.redisClient.duplicate();
    const channel = channelName(String(id));

    const logRealtime = new Map<string, logRealtimeValue>();

    // SEND SNAPSHOT
    const snapshot = await this.repositories.tools.redisRepository.get<ProgressEvent>(
      `${SNAPSHOT_KEY}:${channel}`,
    );

    if (snapshot) sendEvent(`${JSON.stringify(snapshot)}\n`);

    await subscriber.subscribe(channel, async (message, _) => {
      const event: ProgressEvent = JSON.parse(message);

      // SEND EVENT WHEN STATUS AND PERCENTAGE IS NOT SAME WITH PREVIOUS
      const latestLog = logRealtime.get(event.status);

      if (!latestLog || latestLog.status !== event.status || latestLog.percent !== event.percent) {
        sendEvent(message);
        logRealtime.set(event.status, { status: event.status, percent: event.percent });
      }

      if (
        event.status === TrancodingStatus.FAILED ||
        (event.status === TrancodingStatus.CLEANING && event.percent >= 100)
      ) {
        cleanup();
        res.end();
      }
    });

    const heartbeatInterval = setInterval(() => res.write(': heartbeat\n'), 30_000);

    function cleanup() {
      clearInterval(heartbeatInterval);
      subscriber.unsubscribe(channel);
    }

    res.on('close', () => cleanup());
  }
}
