import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, HighlightStyle, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';
import { cdn, emoji, highlight, timestamp } from '../../../utils/markdown.js';

type Options = {
  link: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'invite',
  description: 'Views information about an invite',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'link',
      description: 'The invite link to view',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { link } = options;

    const code = link.match(
      /(https?:\/\/)?(www\.)?(discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]{2,64})/,
    )?.[4];
    if (!code) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid invite link to view`,
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
            content: `${emoji('exclamation')} Please select a valid invite link to view`,
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
                  content: `${emoji('general_info')} **${name}**\n-# ${guildId}`,
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
              content: `${emoji('wumpus')} **Created At:**\n${timestamp(createdAt, TimestampStyle.LongDate)}\n\n${emoji('people')} ${highlight(members, HighlightStyle.Bold)}   ${emoji('channel')} ${highlight(channels)}   ${emoji('nitro_boost')} ${highlight(boosts)}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
