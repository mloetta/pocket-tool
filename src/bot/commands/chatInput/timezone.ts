import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { DateTime } from 'luxon';
import { emoji, timestamp } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'timezone',
  description: 'View the current time for a specific timezone',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'zone',
      description: 'The timezone to view the current time for',
      required: true,
      autocomplete: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async autocomplete(interaction, api) {
    const option = interaction.data.options.find((o) => 'focused' in o && o.focused);
    const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

    const choices = Object.values(Intl.supportedValuesOf('timeZone'))
      .map((z) => ({
        name: z,
        value: z,
      }))
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
  },
  async run(interaction, options, api) {
    const { zone } = options;

    const time = DateTime.now().setZone(zone);

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('clock')} **${zone}**: ${time.toFormat('dd/MM/yyyy, HH:mm:ss')} -> ${timestamp(time.toMillis(), TimestampStyle.ShortDateMediumTime)}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
