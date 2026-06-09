import { REST } from '@discordjs/rest';
import env from '../utils/env.js';
import { CompressionMethod, WebSocketManager, WorkerShardingStrategy } from '@discordjs/ws';
import {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  GatewayDispatchPayload,
  GatewayIntentBits,
  InteractionType,
  MessageFlags,
  ToEventProps,
} from '@discordjs/core';
import { ApplicationCommand, ChatInputOption, Component, GatewayEvent, Localization } from '../types/types.js';
import { readDirectory, shardInfo } from '../utils/utils.js';
import { Collection } from '@discordjs/collection';
import path from 'path';
import { createVoiceAdapter } from '../utils/adapter.js';

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
  compression: CompressionMethod.ZlibSync,
  buildStrategy: (manager) =>
    new WorkerShardingStrategy(manager, {
      shardsPerWorker: 4,
      workerPath: path.join(process.cwd(), 'dist', 'bot', 'worker.js'),
      unknownPayloadHandler(payload) {
        switch (payload.type) {
          case 'dispatch': {
            client.emit(payload.payload.t, {
              data: payload.payload.d,
              api: client.api,
              shardId: payload.shardId,
            });
            break;
          }
          case 'shardInfo': {
            if (payload.data === null) {
              shardInfo.delete(payload.shardId);
            } else {
              const current = shardInfo.get(payload.shardId) ?? {};
              shardInfo.set(payload.shardId, { ...current, ...payload.data });
            }
            break;
          }
        }
      },
    }),
});

export const client = new Client({ rest, gateway });

// custom properties for the client
client.commands = new Collection<string, ApplicationCommand>();
client.components = new Collection<string, Component>();
client.events = new Collection<string, GatewayEvent>();
client.voiceAdapterCreator = (guildId: string) => createVoiceAdapter(client, gateway, guildId);

void bind()
  .then(() => gateway.connect())
  .catch(console.error);

// error handling
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

// helper functions

async function bind(): Promise<void> {
  await Promise.all([
    readDirectory(path.join(process.cwd(), 'dist', 'bot', 'commands')),
    readDirectory(path.join(process.cwd(), 'dist', 'bot', 'components')),
    readDirectory(path.join(process.cwd(), 'dist', 'bot', 'events')),
  ]);

  for (const event of client.events.values()) {
    client.on(event.name, (payload: ToEventProps<Extract<GatewayDispatchPayload, { t: typeof event.name }>['d']>) => {
      event.run(payload.data, client.api).catch((error) => {
        console.error(`An error occurred while running event ${event.name}:`, error);
      });
    });
  }
}

const reply = client.api.interactions.reply.bind(client.api.interactions);

client.api.interactions.reply = (async (interactionId, interactionToken, body, options) => {
  if ((body.content || !!((body.flags ?? 0) & MessageFlags.IsComponentsV2)) && !body.allowed_mentions) {
    body.allowed_mentions = { parse: [] };
  }

  return reply(interactionId, interactionToken, body, options);
}) as typeof client.api.interactions.reply;

const editReply = client.api.interactions.editReply.bind(client.api.interactions);

client.api.interactions.editReply = (async (applicationId, interactionToken, callbackData, messageId, options) => {
  if (
    (callbackData.content || !!((callbackData.flags ?? 0) & MessageFlags.IsComponentsV2)) &&
    !callbackData.allowed_mentions
  ) {
    callbackData.allowed_mentions = { parse: [] };
  }

  return editReply(applicationId, interactionToken, callbackData, messageId, options);
}) as typeof client.api.interactions.editReply;

const followUp = client.api.interactions.followUp.bind(client.api.interactions);

client.api.interactions.followUp = (async (applicationId, interactionToken, body, options) => {
  if ((body.content || !!((body.flags ?? 0) & MessageFlags.IsComponentsV2)) && !body.allowed_mentions) {
    body.allowed_mentions = { parse: [] };
  }

  return followUp(applicationId, interactionToken, body, options);
}) as typeof client.api.interactions.followUp;

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

export function parseComponentArgs<Args extends readonly string[]>(
  component: Component<any>,
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

export function getChatInputOption(
  options: APIApplicationCommandInteractionDataOption[],
  name: string,
): APIApplicationCommandInteractionDataOption | undefined {
  if (!options.length) {
    return undefined;
  }

  for (const option of options) {
    if (option.name === name) {
      return option;
    }

    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      const found = getChatInputOption(option.options ?? [], name);
      if (found) {
        return found;
      }
    }
  }
}

export function getChatInputFocusedOption(
  options: APIApplicationCommandInteractionDataOption[],
): (APIApplicationCommandInteractionDataOption & { value: any }) | undefined {
  for (const option of options) {
    if (
      option.type === ApplicationCommandOptionType.Subcommand ||
      option.type === ApplicationCommandOptionType.SubcommandGroup
    ) {
      const found = getChatInputFocusedOption(option.options ?? []);
      if (found) return found;
    }

    if ('focused' in option && option.focused) {
      return option;
    }
  }
}
