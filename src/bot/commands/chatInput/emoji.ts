import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';
import { cdn, emoji, timestamp } from '../../../utils/markdown.js';

type Options = {
  emoji: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'emoji',
  description: 'Views information about an emoji',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'emoji',
      description: 'The emoji to view information about',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run({ data: interaction, api, shardId }, options, client) {
    const { emoji: rawEmoji } = options;

    const regex = /<(a?):(\w+):(\d+)>/g;
    const matches = [...rawEmoji.matchAll(regex)];

    if (matches.length === 0 || matches.length > 4) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please provide between 1 and 4 valid emojis`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const emojis = matches.map((m) => ({
      animated: !!m[1],
      name: m[2],
      id: m[3],
    }));

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: emojis
                .map(
                  (e) =>
                    `${emoji('sticker')} **${e.name}**\n-# ${e.id}\n\n${emoji('calendar')} **Created At:**\n${timestamp(getTimestampFromSnowflake(e.id), TimestampStyle.LongDate)}`,
                )
                .join('\n'),
            },
            {
              type: ComponentType.MediaGallery,
              items: emojis.map((emoji) => ({
                media: {
                  url: cdn(`/emojis/${emoji.id}`, 1024, emoji.animated ? 'gif' : 'webp', true),
                },
              })),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
