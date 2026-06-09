import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { RequestMethod, ResponseType, TimestampStyle } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { emoji, timestamp } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';
import { getChatInputFocusedOption } from '../../index.js';

createApplicationCommand({
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
  async autocomplete(interaction, api) {
    const focused = getChatInputFocusedOption(interaction.data.options);
    const value = String(focused?.value).toLowerCase() ?? '';

    switch (focused?.name) {
      case 'from': {
        const res = await makeRequest('https://api.frankfurter.dev/v2/currencies', {
          method: RequestMethod.GET,
          response: ResponseType.JSON,
        });

        const choices = res
          .map((c: any) => ({
            name: `${c.name} (${c.iso_code})`,
            value: c.iso_code,
          }))
          .filter((c: any) => c.name.toLowerCase().includes(value))
          .slice(0, 25);

        await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
      case 'to': {
        const res = await makeRequest('https://api.frankfurter.dev/v2/currencies', {
          method: RequestMethod.GET,
          response: ResponseType.JSON,
        });

        const choices = res
          .map((c: any) => ({
            name: `${c.name} (${c.iso_code})`,
            value: c.iso_code,
          }))
          .filter((c: any) => c.name.toLowerCase().includes(value))
          .slice(0, 25);

        await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
        break;
      }
    }
  },
  async run(interaction, options, api) {
    const { amount, from, to } = options;

    const res = await makeRequest(`https://api.frankfurter.dev/v2/rate/${from}/${to}`, {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
    });

    const converted = (amount * res.rate).toLocaleString('en-US', {
      style: 'currency',
      currency: to.toUpperCase(),
    });

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `> Latest exchange rate: ${timestamp(new Date(res.date).getTime(), TimestampStyle.ShortDateShortTime)}\n${emoji('dollar')} ${amount.toLocaleString('en-US', { style: 'currency', currency: from.toUpperCase() })} **${from}** -> ${converted} **${to}**`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
