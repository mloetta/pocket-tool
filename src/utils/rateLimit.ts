import { Collection } from '@discordjs/collection';
import { RateLimit } from '../types/types.js';
import { Snowflake } from '@discordjs/core';

const rateLimits = new Collection<string, Collection<Snowflake, Collection<string, number>>>();

export function checkRateLimit(id: Snowflake, commandName: string, rateLimit: RateLimit) {
  if (rateLimit.cooldown <= 0) throw new Error('Cooldown must be greater than 0.');

  const now = Date.now();

  let scopeBuckets = rateLimits.get(rateLimit.type);
  if (!scopeBuckets) {
    scopeBuckets = new Collection<Snowflake, Collection<string, number>>();
    rateLimits.set(rateLimit.type, scopeBuckets);
  }

  let cooldowns = scopeBuckets.get(id);
  if (!cooldowns) {
    cooldowns = new Collection<string, number>();
    scopeBuckets.set(id, cooldowns);
  }

  const existing = cooldowns.get(commandName);

  if (existing) {
    if (now < existing) {
      return { executable: false, remaining: existing };
    }

    cooldowns.delete(commandName);
  }

  const expiration = now + rateLimit.cooldown * 1000;
  cooldowns.set(commandName, expiration);

  return { executable: true, remaining: 0 };
}
