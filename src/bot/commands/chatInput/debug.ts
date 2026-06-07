import {
  APIMessageComponentEmoji,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { TimestampStyle } from '../../../types/types.js';
import { maskedLink, timestamp } from '../../../utils/markdown.js';
import { getShardIdFromGuildId, getShardInfoFromGuild, toEmojiObject } from '../../../utils/utils.js';
import os from 'os';
import createApplicationCommand from '../../../helpers/command.js';
import { client } from '../../index.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'debug',
  description: 'View some informations about the bot',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, api) {
    const shardId = interaction.guild_id
      ? getShardIdFromGuildId(interaction.guild_id, await client.gateway.getShardCount())
      : 0;
    const totalShards = await client.gateway.getShardCount();
    const shardInfo = await getShardInfoFromGuild(interaction.guild_id, totalShards);
    const latency = shardInfo.latency!.toLocaleString('en-US');
    const uptime = timestamp(Math.floor(shardInfo.uptime!), TimestampStyle.RelativeTime);
    const memory = process.memoryUsage();
    const usedMemory = memory.rss;
    const totalMemory = os.totalmem();
    const memoryUsage = `${Number((usedMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB (${Number((totalMemory / 1024 / 1024).toFixed(2)).toLocaleString('en-US')} MB)`;
    const app = await api.applications.getCurrent();
    const guilds = app.approximate_guild_count;
    const installs = app.approximate_user_install_count;

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `## Pocket Tool, your lightweight, fast, and versatile Discord bot\n-# Developed by **${maskedLink('https://discord.gg/CAr2YgdtAv', 'Keystone')}**, designed by **${maskedLink('https://merpix.de/', 'Merpix')}**, most emojis are from **${maskedLink('https://discord.gg/icons-859387663093727263', 'Icons')}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `### Shard #${shardId}\n> Shards: **${totalShards}**\n> Latency: **${latency}ms**\n> Uptime: **${uptime}**\n> Memory: **${memoryUsage}**\n> Guilds: **${guilds}**\n> Installs: **${installs}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'Invite Me!',
                  emoji: toEmojiObject('link') as APIMessageComponentEmoji,
                  url: `https://discord.com/oauth2/authorize?client_id=${interaction.application_id}`,
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  label: 'Support Server',
                  emoji: toEmojiObject('discord') as APIMessageComponentEmoji,
                  url: 'https://discord.gg/EEAchFSWpr',
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
});
