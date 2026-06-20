import { ApplicationCommandType, ApplicationIntegrationType, ChannelType, ComponentType, InteractionContextType } from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { Permissions } from '../../../types/permissions.js';
import { RateLimitType } from '../../../types/types.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'counting',
  description: 'Manages the counting channel and its settings',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  default_member_permissions: Permissions.MANAGE_CHANNELS,
  rate_limit: {
    type: RateLimitType.Guild,
    cooldown: 5,
  },
  async run(interaction, options, api) {
    await api.interactions.createModal(interaction.id, interaction.token, {
      custom_id: 'counting',
      title: 'Counting',
      components: [
        {
          type: ComponentType.Label,
          label: 'Channel',
          description: 'This channel will be used for the counting minigame (non-numeric messages will be ignored)',
          component: {
            type: ComponentType.ChannelSelect,
            custom_id: 'counting_channel',
            channel_types: [ChannelType.GuildText],
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Action',
          description: 'Action to take when someone sends an incorrect number',
          component: {
            type: ComponentType.RadioGroup,
            custom_id: 'counting_action',
            options: [
              {
                label: 'Restart',
                value: 'restarts',
                description: 'Resets the count back to zero and starts over',
                default: true,
              },
              {
                label: 'Do Nothing',
                value: 'do_nothing',
                description: 'Ignores the wrong number and keeps the current count',
              },
            ],
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Optional Settings',
          description: 'Customize how the counting channel behaves',
          component: {
            type: ComponentType.CheckboxGroup,
            custom_id: 'counting_extra',
            options: [
              {
                label: 'Notify',
                value: 'notify',
                description: 'Notifies the user when they enter an incorrect number',
              },
              {
                label: 'Consecutive Counts',
                value: 'consecutive_counts',
                description: 'Allows the same user to send multiple numbers in a row',
              },
            ],
            required: false,
          },
        },
        {
          type: ComponentType.TextDisplay,
          content:
            '-# Selecting the option below will permanently delete your current counting configuration - you will need to set everything up again if you change your mind',
        },
        {
          type: ComponentType.Label,
          label: 'Delete',
          description: 'Whether you want to delete your current counting configuration',
          component: {
            type: ComponentType.Checkbox,
            custom_id: 'counting_delete',
          },
        },
      ],
    });
  },
});
