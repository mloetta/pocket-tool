import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';
import { cdn, codeblock, emoji, timestamp } from '../../../utils/markdown.js';

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'guild',
  description: 'Views information about the guild',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const guild = await client.api.guilds.get(interaction.guild_id!, { with_counts: true });

    // guild info we will be displaying
    const guildIcon = cdn(`/icons/${guild.id}/${guild.icon}`, 4096, 'webp', true);
    const name = guild.name;
    const members = guild.approximate_member_count;
    const roles = guild.roles.length;
    const channels = (await client.api.guilds.getChannels(guild.id)).length;
    const emojis = guild.emojis.length;
    const stickers = guild.stickers?.length;
    const boosts = guild.premium_subscription_count;
    const ownerId = guild.owner_id;
    const guildId = guild.id;
    const createdAt = getTimestampFromSnowflake(guild.id);

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('general_info')} **${name}**\n-# ${guildId}\n${emoji('owner')} <@${ownerId}>\n\n${emoji('calendar')} **Created At:**\n${timestamp(createdAt, TimestampStyle.LongDate)}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: guildIcon,
                },
              },
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: codeblock(
                'py',
                `Members:   ${String(members).padEnd(3, ' ')}\nRoles:     ${String(roles).padEnd(3, ' ')}\nChannels:  ${String(channels).padEnd(3, ' ')}\nEmojis:    ${String(emojis).padEnd(3, ' ')}\nStickers:  ${String(stickers).padEnd(3, ' ')}\nBoosts:    ${String(boosts).padEnd(3, ' ')}`,
              ),
            },
            {
              type: ComponentType.Separator,
              divider: false,
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: 'Click the button to view the guild features',
                },
              ],
              accessory: {
                type: ComponentType.Button,
                custom_id: `guild-features_${guildId}`,
                label: 'View Features',
                style: ButtonStyle.Secondary,
              },
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand;
