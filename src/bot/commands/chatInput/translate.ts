import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  Locale,
  MessageFlags,
} from '@discordjs/core';
import { RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { emoji } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';
import { getChatInputFocusedOption } from '../../index.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'translate',
  description: 'Translates the given text to any language',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'text',
      description: 'The text to translate',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'from',
      description: 'The language to translate from',
      required: false,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'to',
      description: 'The language to translate to',
      required: false,
      autocomplete: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async autocomplete(interaction, api) {
    const focused = getChatInputFocusedOption(interaction.data.options);
    const value = String(focused?.value).toLowerCase() ?? '';

    switch (focused?.name) {
      case 'from': {
        const choices = [
          {
            name: 'Auto',
            value: 'auto',
          },
          ...Object.entries(Locale).map(([key, value]) => ({
            name: key,
            value,
          })),
        ]
          .filter((c) => c.name.toLowerCase().includes(value))
          .slice(0, 25);

        await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
      case 'to': {
        const choices = Object.entries(Locale)
          .map(([key, value]) => ({
            name: key,
            value,
          }))
          .filter((c) => c.name.toLowerCase().includes(value))
          .slice(0, 25);

        await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
    }
  },
  async run(interaction, options, api) {
    const { text, from, to } = options;

    const res = await makeRequest('https://translate.googleapis.com/translate_a/single', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      params: {
        client: 'gtx',
        sl: from ?? 'auto',
        tl: to ?? interaction.locale,
        dt: 't',
        q: text,
      },
    });

    const languages = new Intl.DisplayNames([interaction.locale], {
      type: 'language',
    });

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> ${emoji('translate')} Translated from **${languages.of(res[2])}** to **${languages.of(to ?? interaction.locale.split('-')[0]!)}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${res[0][0][0]}${to === undefined ? "\n-# Target language was selected based on the user's locale" : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
