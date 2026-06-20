import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIMessageComponentEmoji,
} from '@discordjs/core';
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types.js';
import { hyperlink, timestamp } from '../../../utils/markdown.js';
import { getShardIdFromGuildId, getShardInfoFromGuild, toEmoji } from '../../../utils/utils.js';
import createApplicationCommand from '../../../helpers/command.js';
import { client, linkdave } from '../../index.js';
import { makeRequest } from '../../../utils/request.js';
import env from '../../../utils/env.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'debug',
  description: 'View some informations about the bot',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, api) {
    // bot stats
    const totalShards = await client.gateway.getShardCount();
    const shardId = interaction.guild_id ? getShardIdFromGuildId(interaction.guild_id, totalShards) : 0;
    const shardInfo = await getShardInfoFromGuild(interaction.guild_id, totalShards);
    const memory = process.memoryUsage();
    const app = await api.applications.getCurrent();

    // linkdave stats
    const res = await makeRequest('http://93.115.101.147:15495/stats', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        Authorization: env.get('linkdave_password').toString(),
      },
    });

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `## Pocket Tool, your lightweight, fast, and versatile Discord bot\n-# Developed by **${hyperlink('https://discord.gg/CAr2YgdtAv', 'Keystone')}**, designed by **${hyperlink('https://merpix.de/', 'Merpix')}**, most emojis are from **${hyperlink('https://discord.gg/icons-859387663093727263', 'Icons')}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `### Shard #${shardId}\n> Shards: **${totalShards}**\n> Latency: **${shardInfo.latency!.toLocaleString('en-US')}ms**\n> Uptime: **${timestamp(Math.floor(shardInfo.uptime!), TimestampStyle.RelativeTime)}**\n> Memory: **${Number((memory.heapUsed / 1024 / 1024).toFixed(2)).toLocaleString('en-US', { style: 'unit', unit: 'megabyte' })} (${Number((memory.rss / 1024 / 1024).toFixed(2)).toLocaleString('en-US', { style: 'unit', unit: 'megabyte' })})**\n> Guilds: **${app.approximate_guild_count}**\n> Installs: **${app.approximate_user_install_count}**`,
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
                  emoji: toEmoji('link') as APIMessageComponentEmoji,
                  url: `https://discord.com/oauth2/authorize?client_id=${interaction.application_id}`,
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  label: 'Support Server',
                  emoji: toEmoji('discord') as APIMessageComponentEmoji,
                  url: 'https://discord.gg/EEAchFSWpr',
                  style: ButtonStyle.Link,
                },
              ],
            },
          ],
        },
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `### Text-to-Speech\n> Uptime: **${timestamp(new Date().getTime() - res.uptime_ms, TimestampStyle.RelativeTime)}**\n> Memory: **${Number((res.memory / 1024 / 1024).toFixed(2)).toLocaleString('en-US', { style: 'unit', unit: 'megabyte' })}**\n> Players: **${linkdave.players.size}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
