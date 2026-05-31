import { Collection } from '@discordjs/collection';
import { ApplicationCommand, Component, GatewayEvent } from './types.ts';
import { DiscordGatewayAdapterCreator } from '@discordjs/voice';
import { Snowflake } from '@discordjs/core';

declare module '@discordjs/core' {
  interface Client {
    commands: Collection<string, ApplicationCommand>;
    components: Collection<string, Component>;
    events: Collection<string, GatewayEvent>;
    voiceAdapterCreator: (guildId: Snowflake) => DiscordGatewayAdapterCreator;
  }
}
