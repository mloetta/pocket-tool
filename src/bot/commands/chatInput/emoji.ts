import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { cdn, icon, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';

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
  async run(interaction, options, client) {
    const { emoji } = options;

    const regex = /<(a?):(\w+):(\d+)>/g;
    const matches = [...emoji.matchAll(regex)];

    if (matches.length === 0 || matches.length > 4) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please provide between 1 and 4 valid emojis.`,
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

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: emojis
                .map(
                  (emoji) =>
                    `${icon(Emoji.Expression)} **${emoji.name}**\n-# ${emoji.id}\n\n${icon(Emoji.Wumpus)} **Created At:**\n${timestamp(getTimestampFromSnowflake(emoji.id), TimestampStyle.LongDate)}`,
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
