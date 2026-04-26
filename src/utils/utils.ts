import { join } from 'path';
import { pathToFileURL } from 'url';
import { readdir } from 'fs/promises';
import { Gateway, Snowflake } from '@discordjs/core';
import { WebSocketManager } from '@discordjs/ws';
import {
  DiscordGatewayAdapterCreator,
  DiscordGatewayAdapterImplementerMethods,
  DiscordGatewayAdapterLibraryMethods,
} from '@discordjs/voice';
import { Collection } from '@discordjs/collection';

export async function readDirectory<Type>(folder: string): Promise<Type[]> {
  const files = await readdir(folder, { recursive: true });

  const imported: Type[] = [];

  for (const filename of files) {
    if (!filename.endsWith('.js')) {
      continue;
    }

    const fullPath = join(folder, filename);

    try {
      const result = await import(pathToFileURL(fullPath).href);

      if (!result.default) {
        console.error(`Missing default export in ${fullPath}`);
        continue;
      }

      imported.push(result.default);
    } catch (e) {
      console.error(`Cannot import file (${fullPath}) for reason:`, e);
    }
  }

  return imported;
}

export const hasPermission = (permissions: bigint, permission: bigint) => (permissions & permission) === permission;

export function getShardIdFromGuildId(guildId: string, totalShards: number) {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

export function getTimestampFromSnowflake(snowflake: Snowflake): number {
  // 1420070400000 is the Discord epoch
  return Number(BigInt(snowflake) >> 22n) + 1420070400000;
}

export const adapters = new Collection<Snowflake, DiscordGatewayAdapterLibraryMethods>();

export function createAdapter(guildId: Snowflake, gateway: Gateway, shardCount: number): DiscordGatewayAdapterCreator {
  return (methods) => {
    adapters.set(guildId, methods);

    return {
      sendPayload(payload) {
        const shardId = getShardIdFromGuildId(guildId, shardCount);
        gateway.send(shardId, payload);
        return true;
      },
      destroy() {
        adapters.delete(guildId);
      },
    };
  };
}
