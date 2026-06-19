import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  StickerFormatType,
} from '@discordjs/core';
import { RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';
import { cdn, emoji, timestamp } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'sticker',
  description: 'Views information about a sticker',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'sticker',
      description: 'The sticker to view',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { sticker: rawSticker } = options;

    const sticker = await api.stickers.get(rawSticker);

    if (!sticker) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please provide a valid sticker`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('sticker')} **${sticker.name}**\n-# ${sticker.id}\n*${sticker.description}*\n\n${emoji('calendar')} **Created At:**\n${timestamp(getTimestampFromSnowflake(sticker.id!), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(sticker.id!), TimestampStyle.RelativeTime)})\n\n`,
            },
            {
              type: ComponentType.MediaGallery,
              items: [
                {
                  media: {
                    url: cdn(`/emojis/${sticker.id}`, 1024, 'webp', true),
                  },
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
