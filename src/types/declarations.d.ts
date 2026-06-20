import { Collection } from '@discordjs/collection';
import { ApplicationCommand, Component, GatewayEvent } from './types.ts';
import { Snowflake } from '@discordjs/core';

declare module '@discordjs/core' {
  interface Client {
    commands: Collection<string, ApplicationCommand>;
    components: Collection<string, Component>;
    events: Collection<string, GatewayEvent>;
  }
}
