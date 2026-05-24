import { WorkerBootstrapper, WebSocketShardEvents } from '@discordjs/ws';
import { parentPort } from 'worker_threads';
import { shardInfo } from '../utils/utils.js';

const bootstrapper = new WorkerBootstrapper();

void bootstrapper.bootstrap({
  forwardEvents: [
    WebSocketShardEvents.Closed,
    WebSocketShardEvents.Debug,
    WebSocketShardEvents.Hello,
    WebSocketShardEvents.Ready,
    WebSocketShardEvents.Resumed,
  ],
  shardCallback(shard) {
    shard.on(WebSocketShardEvents.Dispatch, (payload) => {
      parentPort?.postMessage({ type: 'dispatch', shardId: shard.id, payload });
    });

    // tracks shard information
    shard.on(WebSocketShardEvents.Ready, () => {
      const current = shardInfo.get(shard.id);

      shardInfo.set(shard.id, { ...current, uptime: Date.now() });
    });

    shard.on(WebSocketShardEvents.HeartbeatComplete, (payload) => {
      const current = shardInfo.get(shard.id);

      shardInfo.set(shard.id, { ...current, latency: payload.latency });
    });

    shard.on(WebSocketShardEvents.Closed, () => {
      shardInfo.delete(shard.id);
    });
  },
});
