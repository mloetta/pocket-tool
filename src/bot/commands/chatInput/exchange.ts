import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RequestMethod, ResponseType, TimestampStyle } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { icon, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  amount: number;
  from: string;
  to: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'exchange',
  description: 'Convert currency between different units',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Number,
      name: 'amount',
      description: 'The amount of currency to convert',
      required: true,
      min_value: 0.01,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'from',
      description: 'The currency to convert from',
      required: true,
      autocomplete: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'to',
      description: 'The currency to convert to',
      required: true,
      autocomplete: true,
    },
  ],
  acknowledge: true,
  async autocomplete(interaction, client) {
    const option = interaction.data.options.find((o) => 'focused' in o && o.focused);

    switch (option?.name) {
      case 'from': {
        const res = await makeRequest('https://api.frankfurter.dev/v2/currencies', {
          method: RequestMethod.GET,
          response: ResponseType.JSON,
        });

        const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

        const choices = res
          .map((currency: any) => ({
            name: `${currency.name} (${currency.iso_code})`,
            value: currency.iso_code,
          }))
          .filter((c: any) => c.name.toLowerCase().includes(focused))
          .slice(0, 25);

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
      case 'to': {
        const res = await makeRequest('https://api.frankfurter.dev/v2/currencies', {
          method: RequestMethod.GET,
          response: ResponseType.JSON,
        });

        const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

        const choices = res
          .map((currency: any) => ({
            name: `${currency.name} (${currency.iso_code})`,
            value: currency.iso_code,
          }))
          .filter((c: any) => c.name.toLowerCase().includes(focused))
          .slice(0, 25);

        await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
    }
  },
  async run(interaction, options, client) {
    const { amount, from, to } = options;

    const res = await makeRequest(`https://api.frankfurter.dev/v2/rate/${from}/${to}`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });

    const converted = (amount * res.rate).toLocaleString('en-US', {
      style: 'currency',
      currency: to.toUpperCase(),
    });

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> Latest exchange rate: ${timestamp(new Date(res.date).getTime(), TimestampStyle.ShortDateShortTime)}\n${icon(Emoji.Currency)} ${amount.toLocaleString('en-US', { style: 'currency', currency: from.toUpperCase() })} **${from}** -> ${converted} **${to}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
