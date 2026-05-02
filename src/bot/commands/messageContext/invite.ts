import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { cdn, icon, iconPill, pill, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';

export default {
  type: ApplicationCommandType.Message,
  name: 'View Guild',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, client) {
    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    const code = message.content.match(
      /(https?:\/\/)?(www\.)?(discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,64})/,
    )?.[4];
    if (!code) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid invite link to view.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const invite = await client.api.invites.get(code, { with_counts: true });
    if (!invite || !invite.guild) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid invite link to view.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    // guild info we will be displaying
    const guildIcon = cdn(`/icons/${invite.guild.id}/${invite.guild.icon}`, 4096, 'webp', true);
    const name = invite.guild.name;
    const members = invite.approximate_member_count;
    const channels = (await client.api.guilds.getChannels(invite.guild.id)).length;
    const boosts = invite.guild.premium_subscription_count;
    const guildId = invite.guild.id;
    const createdAt = getTimestampFromSnowflake(invite.guild.id);

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
                  content: `${icon(Emoji.Home)} ${name} ${pill(guildId)}\n${timestamp(createdAt, TimestampStyle.LongDate)}\n${iconPill(Emoji.Members, members)} ${iconPill(Emoji.Channel, channels)} ${iconPill(Emoji.Boost, boosts)}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: guildIcon,
                },
              },
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies MessageContextMenuCommand;
