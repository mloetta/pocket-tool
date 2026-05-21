import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  Locale,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { emoji } from '../../../utils/markdown.js';

type Options = {
  text: string;
  from?: string;
  to?: string;
};

export default {
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
  async autocomplete(interaction, client) {
    const option = interaction.data.options.find((o) => 'focused' in o && o.focused);

    switch (option?.name) {
      case 'from': {
        const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

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
          .filter((c) => c.name.toLowerCase().includes(focused))
          .slice(0, 25);

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
      case 'to': {
        const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

        const choices = Object.entries(Locale)
          .map(([key, value]) => ({
            name: key,
            value,
          }))
          .filter((c) => c.name.toLowerCase().includes(focused))
          .slice(0, 25);

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
    }
  },
  async run(interaction, options, client) {
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

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> ${emoji('Translator')} Translated from **${languages.of(res[2])}** to **${languages.of(to ?? interaction.locale.split('-')[0])}**`,
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
} satisfies ChatInputCommand<Options>;
