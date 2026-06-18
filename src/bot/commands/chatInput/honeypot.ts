import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ChannelType,
  ComponentType,
  InteractionContextType,
} from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { Permissions } from '../../../types/permissions.js';
import { RateLimitType } from '../../../types/types.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'honeypot',
  description: 'Manages the honeypot channel and its settings',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  default_member_permissions: Permissions.BAN_MEMBERS,
  rate_limit: {
    type: RateLimitType.Guild,
    cooldown: 5,
  },
  async run(interaction, options, api) {
    await api.interactions.createModal(interaction.id, interaction.token, {
      custom_id: 'honeypot',
      title: 'Honeypot',
      components: [
        {
          type: ComponentType.Label,
          label: 'Channel',
          description:
            'Any message sent in this channel will cause the author to be either banned, kicked or softbanned',
          component: {
            type: ComponentType.ChannelSelect,
            custom_id: 'honeypot_channel',
            channel_types: [ChannelType.GuildText],
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Logs',
          description: 'The channel to log honeypot actions. If not set, actions will not be logged',
          component: {
            type: ComponentType.ChannelSelect,
            custom_id: 'honeypot_logs',
            channel_types: [ChannelType.GuildText],
            required: false,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Action',
          description: 'The action to perform on the author',
          component: {
            type: ComponentType.RadioGroup,
            custom_id: 'honeypot_action',
            options: [
              {
                label: 'Ban',
                value: 'ban',
                description: 'Ban the author from the server',
              },
              {
                label: 'Kick',
                value: 'kick',
                description: 'Kick the author from the server',
              },
              {
                label: 'Softban',
                value: 'softban',
                description: 'Softban the author from the server (ban and immediately unban)',
                default: true,
              },
            ],
            required: false,
          },
        },
        {
          type: ComponentType.TextDisplay,
          content:
            'Enable extra options to improve honeypot experience\n-# - Extra options allow you to customize what happens when the honeypot is triggered\n-# - Some options are mutually exclusive and cannot be enabled at the same time\n-# - All options are __disabled__ by default',
        },
        {
          type: ComponentType.Label,
          label: 'Extra Options',
          description: 'Additional options to improve honeypot experience',
          component: {
            type: ComponentType.CheckboxGroup,
            custom_id: 'honeypot_extra',
            options: [
              {
                label: 'Reinvite',
                value: 'reinvite',
                description: 'Automatically reinvite the user after banning or kicking them',
              },
              {
                label: 'No DM',
                value: 'no_dm',
                description: 'Do not send a DM to the user when they trigger the honeypot',
              },
            ],
            required: false,
          },
        },
      ],
    });
  },
});
