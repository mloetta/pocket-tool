import { WorkerBootstrapper, WebSocketShardEvents } from '@discordjs/ws';
import { parentPort } from 'worker_threads';

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
      parentPort?.postMessage({ type: 'shardInfo', shardId: shard.id, data: { uptime: new Date().getTime() } });
    });

    shard.on(WebSocketShardEvents.Resumed, () => {
      parentPort?.postMessage({ type: 'shardInfo', shardId: shard.id, data: { uptime: new Date().getTime() } });
    });

    shard.on(WebSocketShardEvents.HeartbeatComplete, (payload) => {
      parentPort?.postMessage({ type: 'shardInfo', shardId: shard.id, data: { latency: payload.latency } });
    });

    shard.on(WebSocketShardEvents.Closed, () => {
      parentPort?.postMessage({ type: 'shardInfo', shardId: shard.id, data: null });
    });
  },
});
