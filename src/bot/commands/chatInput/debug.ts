import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, TimestampStyle } from '../../../types/types.js';
import { iconAsEmoji, link, timestamp } from '../../../utils/markdown.js';
import { getShardIdFromGuildId } from '../../../utils/utils.js';
import os from 'os';
import { shardLatency } from '../../index.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'debug',
  description: 'View some informations about the bot',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, client) {
    const shardId = interaction.guild_id
      ? getShardIdFromGuildId(interaction.guild_id, await client.gateway.getShardCount())
      : 0;
    const latency = shardLatency.get(shardId)?.toLocaleString('en-US');
    const uptime = timestamp(Math.floor(Date.now() - process.uptime() * 1000), TimestampStyle.RelativeTime);
    const memory = process.memoryUsage();
    const usedMemory = memory.rss;
    const totalMemory = os.totalmem();
    const memoryUsage = `${Number((usedMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB (${Number((totalMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB)`;
    const app = await client.api.applications.getCurrent();
    const guilds = app.approximate_guild_count;
    const installs = app.approximate_user_install_count;

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `## Pocket Tool, your lightweight, fast, and versatile Discord bot\n-# Developed by **${link('https://discord.gg/CAr2YgdtAv', 'Keystone')}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `### Shard #${shardId}\n> Latency: **${latency !== undefined ? `${latency}ms` : 'N/A'}**\n> Uptime: **${uptime}**\n> Memory: **${memoryUsage}**\n> Guilds: **${guilds}**\n> Installs: **${installs}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'Support Server',
                  emoji: iconAsEmoji(Emoji.Discord),
                  url: 'https://discord.gg/EEAchFSWpr',
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  label: 'Invite Me!',
                  emoji: iconAsEmoji(Emoji.Link),
                  url: `https://discord.com/oauth2/authorize?client_id=${interaction.application_id}`,
                  style: ButtonStyle.Link,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand;
