import { Collection } from '@discordjs/collection';
import { ApplicationCommand, Component, GatewayEvent } from './types.ts';

declare module '@discordjs/core' {
  interface Client {
    commands: Collection<string, ApplicationCommand>;
    components: Collection<string, Component>;
    events: Collection<string, GatewayEvent>;
  }
}
