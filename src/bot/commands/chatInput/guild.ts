import { ApplicationCommandType, ApplicationIntegrationType, ComponentType, InteractionContextType, MessageFlags } from '@discordjs/core';
import { RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';
import { cdn, codeblock, emoji, timestamp } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
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
  async run(interaction, options, api) {
    const guild = await api.guilds.get(interaction.guild_id!, { with_counts: true });

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('general_info')} **${guild.name}**\n-# ${guild.id}\n${emoji('owner')} <@${guild.owner_id}>\n\n${emoji('calendar')} **Created At:**\n${timestamp(getTimestampFromSnowflake(guild.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(guild.id), TimestampStyle.RelativeTime)})`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: cdn(`/icons/${guild.id}/${guild.icon}`, 4096, 'webp', true),
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
                `Members:   ${String(guild.approximate_member_count).padEnd(3, ' ')}\nRoles:     ${String(guild.roles.length).padEnd(3, ' ')}\nChannels:  ${String((await api.guilds.getChannels(guild.id)).length).padEnd(3, ' ')}\nEmojis:    ${String(guild.emojis.length).padEnd(3, ' ')}\nStickers:  ${String(guild.stickers?.length).padEnd(3, ' ')}\nBoosts:    ${String(guild.premium_subscription_count).padEnd(3, ' ')}`,
              ),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
