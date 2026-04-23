import {
  ActivityType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GatewayDispatchEvents,
  PresenceUpdateStatus,
  Snowflake,
} from '@discordjs/core';
import { BooleanChatInputOption, GatewayEvent, NonPrimaryEntryPointCommand } from '../../types/types.js';
import env from '../../utils/env.js';
import { localizeCommand } from '../index.js';

export default {
  name: GatewayDispatchEvents.Ready,
  async run(payload, client) {
    console.log(`Shard #${payload.shard![0]} is ready!`);

    await client.updatePresence(payload.shard![0], {
      since: null,
      activities: [
        {
          type: ActivityType.Custom,
          name: 'shardId',
          state: `You're on shard #${payload.shard![0]}!`,
        },
      ],
      status: PresenceUpdateStatus.Online,
      afk: false,
    });

    if (env.get('register_commands').toBoolean() === true) {
      for (const command of client.commands.values()) {
        if (command.type !== ApplicationCommandType.ChatInput) {
          continue;
        }

        command.options ??= [];

        const incognito = {
          type: ApplicationCommandOptionType.Boolean,
          name: 'incognito',
          description: 'Whether the response should only be visible to you',
        } satisfies BooleanChatInputOption;

        let hasSubOrGroup = false;

        for (const option of command.options) {
          if (option.type === ApplicationCommandOptionType.SubcommandGroup && option.options) {
            hasSubOrGroup = true;

            for (const sub of option.options) {
              if (sub.type === ApplicationCommandOptionType.Subcommand) {
                sub.options ??= [];
                sub.options.push(incognito);
              }
            }
          } else if (option.type === ApplicationCommandOptionType.Subcommand) {
            hasSubOrGroup = true;
            option.options ??= [];
            option.options.push(incognito);
          }
        }

        if (!hasSubOrGroup) {
          command.options.push(incognito);
        }
      }

      const globalCommands = Array.from(client.commands.values())
        .filter((command) => !('guild' in command))
        .map(localizeCommand);

      if (globalCommands.length) {
        await client.api.applicationCommands
          .bulkOverwriteGlobalCommands(payload.user.id, globalCommands)
          .then(() => console.log(`Registered ${globalCommands.length} global commands.`))
          .catch((error) => console.error(`Failed to register global commands: ${error}`));
      }

      const guildCommands = Array.from(client.commands.values()).filter(
        (command) => 'guild' in command,
      ) as NonPrimaryEntryPointCommand[];

      if (guildCommands.length) {
        const guilds: Record<Snowflake, ReturnType<typeof localizeCommand>[]> = {};

        for (const command of guildCommands) {
          if (!command.guild) {
            continue;
          }

          if (!guilds[command.guild]) {
            guilds[command.guild] = [];
          }

          guilds[command.guild].push(localizeCommand(command));
        }

        for (const [guildId, cmds] of Object.entries(guilds)) {
          await client.api.applicationCommands
            .bulkOverwriteGuildCommands(payload.user.id, guildId, cmds)
            .then(() => console.log(`Registered ${cmds.length} guild commands for guild ${guildId}.`))
            .catch((error) => console.error(`Failed to register guild commands for guild ${guildId}: ${error}`));

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  },
} satisfies GatewayEvent<GatewayDispatchEvents.Ready>;
