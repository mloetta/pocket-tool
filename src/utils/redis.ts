import env from './env.js';
import { Redis } from 'ioredis';

export const redis = new Redis({
  username: 'pocket-tool',
  password: env.get('redis_password', true).toString(),
  host: env.get('redis_host', true).toString(),
  port: env.get('redis_port', true).toNumber(),
});
