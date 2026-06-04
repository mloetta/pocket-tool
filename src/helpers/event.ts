import { GatewayDispatchEvents } from '@discordjs/core';
import { client } from '../bot/index.js';
import { GatewayEvent } from '../types/types.js';

export default function createGatewayEvent<const Event extends GatewayDispatchEvents = GatewayDispatchEvents>(
  event: GatewayEvent<Event>,
): void {
  client.events.set(event.name, event as unknown as GatewayEvent);
}
