import { REST } from '@discordjs/rest';
import env from '../utils/env.js';
import { CompressionMethod, WebSocketManager, WebSocketShardEvents, WorkerShardingStrategy } from '@discordjs/ws';
import {
  APIApplicationCommandInteractionDataOption,
  APIChatInputApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  GatewayIntentBits,
  InteractionType,
} from '@discordjs/core';
import { ApplicationCommand, ChatInputOption, Component, GatewayEvent, Localization } from '../types/types.js';
import { readDirectory, shardInfo } from '../utils/utils.js';
import { Collection } from '@discordjs/collection';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rest = new REST().setToken(env.get('token', true).toString());

const gateway = new WebSocketManager({
  token: env.get('token', true).toString(),
  intents: GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent,
  shardCount: null,
  rest,
  compression: CompressionMethod.ZlibNative,
  buildStrategy: (manager) =>
    new WorkerShardingStrategy(manager, {
      shardsPerWorker: 4,
      /*
      workerPath: path.join(__dirname, 'worker.js'),
      unknownPayloadHandler(payload) {
        switch (payload.type) {
          case 'dispatch': {
            client.emit(payload.payload.t, payload.payload.d);
          }
        }
      },
      */
    }),
});

// shard info stuff
gateway.on(WebSocketShardEvents.Ready, (_, shardId) => {
  const current = shardInfo.get(shardId);

  shardInfo.set(shardId, { ...current, uptime: Date.now() });
});

gateway.on(WebSocketShardEvents.HeartbeatComplete, (payload, shardId) => {
  const current = shardInfo.get(shardId);

  shardInfo.set(shardId, { ...current, latency: payload.latency });
});

gateway.on(WebSocketShardEvents.Closed, (shardId) => {
  shardInfo.delete(shardId);
});

const client = new Client({ rest, gateway });

client.commands = new Collection<string, ApplicationCommand>();
client.components = new Collection<string, Component>();
client.events = new Collection<string, GatewayEvent>();

// load everything and then connect to the gateway
void loadModules().then(() => void gateway.connect());

// error handling
process.on('uncaughtException', console.error);
process.on('unhandledRejection', console.error);

async function loadModules() {
  const basePath = path.join(process.cwd(), 'dist', 'bot');

  if (fs.existsSync(path.join(basePath, 'commands'))) {
    const commands = await readDirectory<ApplicationCommand>(path.join(basePath, 'commands'));

    for (const command of commands) {
      client.commands.set((command.name as any).global ?? command.name, command);
    }
  }

  if (fs.existsSync(path.join(basePath, 'components'))) {
    const components = await readDirectory<Component>(path.join(basePath, 'components'));

    for (const component of components) {
      client.components.set(component.custom_id, component);
    }
  }

  if (fs.existsSync(path.join(basePath, 'events'))) {
    const events = await readDirectory<GatewayEvent>(path.join(basePath, 'events'));

    for (const event of events) {
      client.events.set(event.name, event);

      console.log(`Binding event: ${event.name}`);

      client.on(event.name, async (payload: any) => {
        try {
          await event.run(payload.data, client);
        } catch (e) {
          console.log(`An error occurred while running event ${event.name}:`, e);
        }
      });
    }
  }
}

// helper functions

const reply = client.api.interactions.reply.bind(client.api.interactions);

client.api.interactions.reply = (async (interactionId, interactionToken, body, options) => {
  if (body.content || body.components || body.embeds) {
    body.allowed_mentions = { parse: [] };
  }

  return reply(interactionId, interactionToken, body, options);
}) as typeof client.api.interactions.reply;

const editReply = client.api.interactions.editReply.bind(client.api.interactions);

client.api.interactions.editReply = (async (applicationId, interactionToken, callbackData, messageId, options) => {
  if (callbackData.content || callbackData.components || callbackData.embeds) {
    callbackData.allowed_mentions = { parse: [] };
  }

  return editReply(applicationId, interactionToken, callbackData, messageId, options);
}) as typeof client.api.interactions.editReply;

const followUp = client.api.interactions.followUp.bind(client.api.interactions);

client.api.interactions.followUp = (async (applicationId, interactionToken, body, options) => {
  if (body.content || body.components || body.embeds) {
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
