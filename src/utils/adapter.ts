import { Collection } from '@discordjs/collection';
import { Client, GatewayDispatchEvents, GatewayOpcodes, type Snowflake } from '@discordjs/core';
import { WebSocketManager, WebSocketShardEvents } from '@discordjs/ws';
import { getShardIdFromGuildId } from './utils.js';
import env from './env.js';
import type { DiscordGatewayAdapterCreator, DiscordGatewayAdapterLibraryMethods } from '@discordjs/voice';

const adapters = new Collection<Snowflake, DiscordGatewayAdapterLibraryMethods>();
const trackedClients = new Set<Client>();

const botId = atob(env.get('token').toString().split('.')[0]!);

function trackClient(client: Client) {
  if (trackedClients.has(client)) {
    return;
  }

  trackedClients.add(client);

  client.on(GatewayDispatchEvents.VoiceServerUpdate, (payload) => {
    adapters.get(payload.data.guild_id)?.onVoiceServerUpdate(payload.data);
  });

  client.on(GatewayDispatchEvents.VoiceStateUpdate, (payload) => {
    if (payload.data.guild_id && payload.data.session_id && payload.data.user_id === botId) {
      adapters.get(payload.data.guild_id)?.onVoiceStateUpdate(payload.data);
    }
  });
}

const trackedShards = new Collection<number, Set<Snowflake>>();

function trackGuild(gateway: WebSocketManager, guildId: Snowflake, shardCount: number) {
  const shardId = getShardIdFromGuildId(guildId, shardCount);

  let guilds = trackedShards.get(shardId);

  if (!guilds) {
    guilds = new Set();
    trackedShards.set(shardId, guilds);
  }

  guilds.add(guildId);

  gateway.on(WebSocketShardEvents.Closed, (_, closedShardId) => {
    const shardGuilds = trackedShards.get(closedShardId);

    if (shardGuilds) {
      for (const id of shardGuilds.values()) {
        adapters.get(id)?.destroy();
      }
    }

    trackedShards.delete(closedShardId);
  });
}

export function createVoiceAdapter(
  client: Client,
  gateway: WebSocketManager,
  guildId: Snowflake,
): DiscordGatewayAdapterCreator {
  return (methods) => {
    adapters.set(guildId, methods);

    trackClient(client);

    const shardCount = gateway.options.shardCount ?? 1;
    trackGuild(gateway, guildId, shardCount);

    const shardId = getShardIdFromGuildId(guildId, shardCount);

    return {
      sendPayload(payload) {
        if (payload.op === GatewayOpcodes.VoiceStateUpdate) {
          void gateway.send(shardId, payload);
          return true;
        }
        return false;
      },
      destroy() {
        return adapters.delete(guildId);
      },
    };
  };
}
