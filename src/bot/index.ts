import { REST } from '@discordjs/rest';
import env from '../utils/env.js';
import { WebSocketManager, WebSocketShardEvents, WorkerShardingStrategy } from '@discordjs/ws';
import {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  GatewayDispatchEvents,
  GatewayIntentBits,
  InteractionType,
} from '@discordjs/core';
import { ApplicationCommand, ChatInputOption, Component, GatewayEvent, Localization } from '../types/types.js';
import { adapters, readDirectory } from '../utils/utils.js';
import path from 'path';
import { Collection } from '@discordjs/collection';
import fs from 'fs';

const rest = new REST().setToken(env.get('token', true).toString());

const gateway = new WebSocketManager({
  token: env.get('token', true).toString(),
  intents:
    GatewayIntentBits.Guilds |
    GatewayIntentBits.GuildMessages |
    GatewayIntentBits.MessageContent |
    GatewayIntentBits.GuildVoiceStates,
  shardCount: null,
  rest,
  buildStrategy: (manager) => new WorkerShardingStrategy(manager, { shardsPerWorker: 4 }),
});

const client = new Client({ rest, gateway });

client.gateway.on(WebSocketShardEvents.Dispatch, (payload) => {
  const { t: type, d: data } = payload;

  if (!data || !('guild_id' in data) || !data.guild_id) return;

  const adapter = adapters.get(data.guild_id);
  if (!adapter) return;

  switch (type) {
    case GatewayDispatchEvents.VoiceStateUpdate:
      adapter.onVoiceStateUpdate(data);
      break;
    case GatewayDispatchEvents.VoiceServerUpdate:
      adapter.onVoiceServerUpdate(data);
      break;
  }
});

client.commands = new Collection<string, ApplicationCommand>();
client.components = new Collection<string, Component>();
client.events = new Collection<string, GatewayEvent>();

// Load commands, events and components
(async () => {
  if (fs.existsSync(path.join(process.cwd(), 'dist', 'bot', 'commands'))) {
    const commands = await readDirectory<ApplicationCommand>(path.join(process.cwd(), 'dist', 'bot', 'commands'));
    for (const command of commands) {
      client.commands.set((command.name as any).global ?? command.name, command);
    }
  }

  if (fs.existsSync(path.join(process.cwd(), 'dist', 'bot', 'components'))) {
    const components = await readDirectory<Component>(path.join(process.cwd(), 'dist', 'bot', 'components'));
    for (const component of components) {
      client.components.set(component.custom_id, component);
    }
  }

  if (fs.existsSync(path.join(process.cwd(), 'dist', 'bot', 'events'))) {
    const events = await readDirectory<GatewayEvent>(path.join(process.cwd(), 'dist', 'bot', 'events'));
    for (const event of events) {
      client.events.set(event.name, event);
    }
  }

  for (const event of client.events.values()) {
    console.log(`Binding event: ${event.name}`);

    client.on(event.name, async (payload: any) => {
      try {
        await event.run(payload.data, client);
      } catch (e) {
        console.log(`An error occurred while running event ${event.name}:`, e);
      }
    });
  }
})();

gateway.connect();

// Error handling
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// helper function to localize an application command for use with the Discord API
function resolveLocalization(loc: Localization) {
  if (typeof loc === 'string') {
    return { value: loc, localizations: undefined };
  }

  const { global, ...rest } = loc;

  return {
    value: global,
    localizations: Object.keys(rest).length ? rest : undefined,
  };
}

function resolveOption(option: ChatInputOption): any {
  const name = resolveLocalization(option.name);
  const description = resolveLocalization(option.description);

  return {
    ...option,
    name: name.value,
    description: description.value,
    name_localizations: name.localizations,
    description_localizations: description.localizations,
    ...('options' in option && option.options ? { options: option.options.map(resolveOption) } : {}),
  };
}

export function localizeCommand(command: ApplicationCommand): any {
  if (command.type === ApplicationCommandType.ChatInput) {
    const description = resolveLocalization(command.description);

    return {
      ...command,
      ...resolveLocalization(command.name),
      description: description.value,
      description_localizations: description.localizations,
      options: command.options?.map(resolveOption),
    };
  }

  return {
    ...command,
    ...resolveLocalization(command.name),
  };
}

/**
 * Chat Input Command option parser to make it easier to access option values
 * @param interaction The interaction to parse
 * @returns A record of option names to values
 */
export function parseCommandOptions(
  interaction: APIChatInputApplicationCommandInteraction,
  options?: APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>[],
): Record<string, unknown> {
  if (!interaction.data) {
    return {};
  }

  if (!options) {
    options = interaction.data.options ?? [];
  }

  const args: Record<string, unknown> = {};

  for (const option of options) {
    switch (option.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        args[option.name] = parseCommandOptions(interaction, option.options);
        break;
      case ApplicationCommandOptionType.Channel:
        args[option.name] = interaction.data.resolved?.channels?.[option.value];
        break;
      case ApplicationCommandOptionType.Role:
        args[option.name] = interaction.data.resolved?.roles?.[option.value];
        break;
      case ApplicationCommandOptionType.User:
        args[option.name] = {
          user: interaction.data.resolved?.users?.[option.value],
          member: interaction.data.resolved?.members?.[option.value],
        };
        break;
      case ApplicationCommandOptionType.Attachment:
        args[option.name] = interaction.data.resolved?.attachments?.[option.value];
        break;
      case ApplicationCommandOptionType.Mentionable:
        args[option.name] = interaction.data.resolved?.roles?.[option.value] ?? {
          user: interaction.data.resolved?.users?.[option.value],
          member: interaction.data.resolved?.members?.[option.value],
        };
        break;
      default:
        args[option.name] = option.value;
    }
  }

  return args;
}

/**
 * Parses component arguments from a string array into a record based on the component's arg keys.
 * @param component The component to parse arguments for.
 * @param args The string array of arguments to parse.
 * @returns A record of parsed arguments.
 */
export function parseComponentArgs<Args extends readonly string[]>(
  component: Component,
  args: string[],
): Record<Args[number], string> {
  const result = {} as Record<Args[number], string>;

  const keys = component.args;
  if (!keys) {
    return result;
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = args[i];

    if (!key || value === undefined) {
      continue;
    }

    result[key as Args[number]] = value;
  }

  return result;
}
