import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: ApplicationCommandType.Message,
  name: 'Translate',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, client) {
    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    const content = message.content;
    if (!content) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid message to translate`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const res = await makeRequest('https://translate.googleapis.com/translate_a/single', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        client: 'gtx',
        sl: 'auto',
        tl: interaction.locale,
        dt: 't',
        q: content,
      },
    });

    const languages = new Intl.DisplayNames([interaction.locale], {
      type: 'language',
    });

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> ${icon(Emoji.Translator)} Translated from **${languages.of(res[2])}** to **${languages.of(interaction.locale.split('-')[0])}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${res[0][0][0]}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies MessageContextMenuCommand;
