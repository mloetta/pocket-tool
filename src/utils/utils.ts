import { join } from 'path';
import { pathToFileURL } from 'url';
import { readdir } from 'fs/promises';
import { APIGuildChannel, APIGuildMember, APIRole, Snowflake } from '@discordjs/core';
import { ALL_PERMISSIONS, Permissions } from '../types/permissions.js';
import { Emoji } from '../types/emojis.js';

const EPOCH = 1420070400000;

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

export function hasPermission(permissions: bigint, permission: bigint) {
  return (permissions & permission) === permission;
}

export function getPermissionsFor(member: APIGuildMember, channel: APIGuildChannel, roles: APIRole[]) {
  let permissions: bigint = 0n;

  // Get the everyone role and apply its permissions
  const everyoneRole = roles.find((role) => role.id === channel.guild_id);

  if (everyoneRole) {
    permissions |= BigInt(everyoneRole.permissions);
  }

  // Apply channel permission overwrites for everyone
  const everyoneOverwrite = channel.permission_overwrites?.find(
    (overwrite) => overwrite.id === channel.guild_id && overwrite.type === 0,
  );

  if (everyoneOverwrite) {
    permissions &= ~BigInt(everyoneOverwrite.deny);
    permissions |= BigInt(everyoneOverwrite.allow);
  }

  // Apply member role permissions
  for (const roleId of member.roles) {
    const role = roles.find((role) => role.id === roleId);

    if (!role) continue;

    permissions |= BigInt(role.permissions);
  }

  // Return all permissions if the member is an administrator
  if (hasPermission(permissions, BigInt(Permissions.ADMINISTRATOR))) {
    return ALL_PERMISSIONS;
  }

  // Apply member role permission overwrites
  for (const roleId of member.roles) {
    const overwrite = channel.permission_overwrites?.find(
      (overwrite) => overwrite.id === roleId && overwrite.type === 0,
    );

    if (!overwrite) continue;

    permissions &= ~BigInt(overwrite.deny);
    permissions |= BigInt(overwrite.allow);
  }

  // Apply member permission overwrites
  const memberOverwrite = channel.permission_overwrites?.find(
    (overwrite) => overwrite.id === member.user.id && overwrite.type === 1,
  );

  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
}

export function getShardIdFromGuildId(guildId: string, totalShards: number) {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

export function getTimestampFromSnowflake(snowflake: Snowflake): number {
  return Number(BigInt(snowflake) >> 22n) + EPOCH;
}

export function msToApproxTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `~${(ms / 1000).toFixed(1)}s`;
}

export function msToReadableTime(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function toEmojiObject(name: keyof typeof Emoji) {
  const emoji = Emoji[name];

  if (!emoji) {
    throw new Error(`Emoji "${name}" not found`);
  }

  return {
    id: emoji.replace(/<a?:[a-z0-9_]*:([0-9]*)>/g, '$1'),
    name: 'e',
    animated: emoji.startsWith('<a:'),
  };
}
