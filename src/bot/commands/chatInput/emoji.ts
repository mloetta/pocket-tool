import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import { cdn, icon, pill } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

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
              content: emojis.map((e) => `${icon(Emoji.Expression)} ${e.name} ${pill(e.id)}`).join('\n'),
            },
            {
              type: ComponentType.MediaGallery,
              items: emojis.map((e) => ({
                media: {
                  url: cdn(`/emojis/${e.id}`, 1024, e.animated ? 'gif' : 'webp', true),
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
