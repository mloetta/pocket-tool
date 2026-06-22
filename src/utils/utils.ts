import { join } from 'path';
import { pathToFileURL } from 'url';
import { readdir } from 'fs/promises';
import { ALL_PERMISSIONS, Permissions } from '../types/permissions.js';
import { Emoji } from '../types/emojis.js';
import { Collection } from '@discordjs/collection';
import type { ShardInformation } from '../types/types.js';
import type { APIEmoji, APIGuildChannel, APIGuildMember, APIMessageComponentEmoji, APIRole, Snowflake } from '@discordjs/core';

export const shardInfo = new Collection<number, ShardInformation>();

export async function readDirectory(folder: string): Promise<void> {
  const files = await readdir(folder, { recursive: true });

  for (const filename of files) {
    if (!filename.endsWith('.js')) continue;

    const fullPath = join(folder, filename);

    await import(pathToFileURL(fullPath).href).catch((error) => console.log(`Cannot import file (${fullPath}) for reason:`, error));
  }
}

export function hasPermission(permissions: bigint, permission: bigint): boolean {
  return (permissions & permission) === permission;
}

export function getPermissionsFor(member: APIGuildMember, channel: APIGuildChannel, roles: APIRole[]): bigint {
  let permissions: bigint = 0n;

  // Get the everyone role and apply its permissions
  const everyoneRole = roles.find((role) => role.id === channel.guild_id);

  if (everyoneRole) {
    permissions |= BigInt(everyoneRole.permissions);
  }

  // Apply channel permission overwrites for everyone
  const everyoneOverwrite = channel.permission_overwrites?.find((overwrite) => overwrite.id === channel.guild_id && overwrite.type === 0);

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
    const overwrite = channel.permission_overwrites?.find((overwrite) => overwrite.id === roleId && overwrite.type === 0);

    if (!overwrite) continue;

    permissions &= ~BigInt(overwrite.deny);
    permissions |= BigInt(overwrite.allow);
  }

  // Apply member permission overwrites
  const memberOverwrite = channel.permission_overwrites?.find((overwrite) => overwrite.id === member.user.id && overwrite.type === 1);

  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny);
    permissions |= BigInt(memberOverwrite.allow);
  }

  return permissions;
}

export function getShardIdFromGuildId(guildId: string, totalShards: number): number {
  return Number((BigInt(guildId) >> 22n) % BigInt(totalShards));
}

export async function getShardInfoFromGuild(guildId: Snowflake | undefined, totalShards: number): Promise<ShardInformation & { shardId: number }> {
  const shardId = guildId ? getShardIdFromGuildId(guildId, totalShards) : 0;
  const info = shardInfo.get(shardId);

  return {
    shardId,
    latency: info?.latency ?? -1,
    uptime: info?.uptime ?? -1,
  };
}

const DISCORD_EPOCH = 1420070400000;

export function getTimestampFromSnowflake(snowflake: Snowflake): number {
  return Number(BigInt(snowflake) >> 22n) + DISCORD_EPOCH;
}

const TIME_UNITS = {
  y: 1000 * 60 * 60 * 24 * 365,
  d: 1000 * 60 * 60 * 24,
  h: 1000 * 60 * 60,
  m: 1000 * 60,
  s: 1000,
};

export function msToApproxTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < TIME_UNITS.m) return `~${(ms / 1000).toFixed(1)}s`;
  if (ms < TIME_UNITS.h) return `~${Math.round(ms / TIME_UNITS.m)}m`;
  if (ms < TIME_UNITS.d) return `~${(ms / TIME_UNITS.h).toFixed(1)}h`;
  if (ms < TIME_UNITS.y) return `~${(ms / TIME_UNITS.d).toFixed(1)}d`;
  return `~${(ms / TIME_UNITS.y).toFixed(1)}y`;
}

export function msToReadableTime(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / TIME_UNITS.m) % 60;
  const hours = Math.floor(ms / TIME_UNITS.h) % 24;
  const days = Math.floor(ms / TIME_UNITS.d) % 365;
  const years = Math.floor(ms / TIME_UNITS.y);

  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function readableTimeToMs(time: string): number | null {
  const matches = time.matchAll(/(\d+)(y|d|h|m|s)/g);

  let ms = 0;

  let matched = false;

  for (const [, value, unit] of matches) {
    if (!value || !unit) continue;

    ms += parseInt(value, 10) * TIME_UNITS[unit as keyof typeof TIME_UNITS];
    matched = true;
  }

  return matched ? ms : null;
}

export function toEmoji(name: keyof typeof Emoji): APIEmoji | APIMessageComponentEmoji {
  const emoji = Emoji[name];

  if (!emoji) throw new Error(`Emoji "${name}" not found`);

  return {
    id: emoji.replace(/<a?:[a-z0-9_]*:([0-9]*)>/g, '$1'),
    name: 'e',
    animated: emoji.startsWith('<a:'),
  };
}

export function toReactionEmoji(name: keyof typeof Emoji): string {
  const emoji = Emoji[name];

  if (!emoji) throw new Error(`Emoji "${name}" not found`);

  return emoji.replace(/<a?:(.+):(\d+)>/, '$1:$2');
}
