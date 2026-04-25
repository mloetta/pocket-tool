import { REST } from '@discordjs/rest';
import env from '../utils/env.js';
import { WebSocketManager, WebSocketShardEvents, WorkerShardingStrategy } from '@discordjs/ws';
import {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  ComponentType,
  GatewayDispatchEvents,
  GatewayIntentBits,
  InteractionType,
  MessageFlags,
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
export function localizeCommand(command: ApplicationCommand): any {
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

    const base = {
      ...option,
      name: name.value,
      description: description.value,
      name_localizations: name.localizations,
      description_localizations: description.localizations,
    };

    if ('options' in option && option.options) {
      return {
        ...base,
        options: option.options.map(resolveOption),
      };
    }

    return base;
  }

  const name = resolveLocalization(command.name);

  const base = {
    ...command,
    name: name.value,
    name_localizations: name.localizations,
  };

  if (command.type === ApplicationCommandType.ChatInput) {
    const description = resolveLocalization(command.description);

    return {
      ...base,
      description: description.value,
      description_localizations: description.localizations,
      options: command.options?.map(resolveOption),
    };
  }

  return base;
}

/**
 * Chat Input Command option parser to make it easier to access option values
 * @param interaction The interaction to parse
 * @param options The options to parse, defaults to the interaction's options
 * @returns A record of option names to values
 */
export function parseCommandOptions(interaction: APIChatInputApplicationCommandInteraction): Record<string, unknown> {
  if (!interaction.data) {
    return {};
  }

  const options = interaction.data.options ?? [];

  const args: Record<string, unknown> = {};

  for (const option of options) {
    switch (option.type) {
      case ApplicationCommandOptionType.SubcommandGroup:
      case ApplicationCommandOptionType.Subcommand:
        args[option.name] = parseCommandOptions(interaction);
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

// Override interaction methods to only send responses with cv2

const reply = client.api.interactions.reply.bind(client.api.interactions);

// @ts-expect-error - for some ungodly reason, the return type of reply can be undefined, but we know it will never be undefined in our case
client.api.interactions.reply = async (interactionId, interactionToken, body, options) => {
  const flags = body.flags ?? 0;
  const isComponentsV2 = Boolean(flags & MessageFlags.IsComponentsV2);

  if (!isComponentsV2 && body.content) {
    const content = body.content;

    if (!body.components) {
      body.components = [];
    }

    body.components.push({
      type: ComponentType.TextDisplay,
      content,
    });

    body.flags = flags | MessageFlags.IsComponentsV2;
    delete body.content;
  }

  return reply(interactionId, interactionToken, body, options);
};

const editReply = client.api.interactions.editReply.bind(client.api.interactions);

client.api.interactions.editReply = async (applicationId, interactionToken, callbackData, messageId, options) => {
  const flags = callbackData.flags ?? 0;
  const isComponentsV2 = Boolean(flags & MessageFlags.IsComponentsV2);

  if (!isComponentsV2 && callbackData.content) {
    const content = callbackData.content;

    if (!callbackData.components) {
      callbackData.components = [];
    }

    callbackData.components.push({
      type: ComponentType.TextDisplay,
      content,
    });

    callbackData.flags = flags | MessageFlags.IsComponentsV2;
    delete callbackData.content;
  }

  return editReply(applicationId, interactionToken, callbackData, messageId, options);
};

const followUp = client.api.interactions.followUp.bind(client.api.interactions);

client.api.interactions.followUp = async (applicationId, interactionToken, body, options) => {
  const flags = body.flags ?? 0;
  const isComponentsV2 = Boolean(flags & MessageFlags.IsComponentsV2);

  if (!isComponentsV2 && body.content) {
    const content = body.content;

    if (!body.components) {
      body.components = [];
    }

    body.components.push({
      type: ComponentType.TextDisplay,
      content,
    });

    body.flags = flags | MessageFlags.IsComponentsV2;
    delete body.content;
  }

  return followUp(applicationId, interactionToken, body, options);
};
