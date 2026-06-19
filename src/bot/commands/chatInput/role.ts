import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIMessageTopLevelComponent,
} from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { RateLimitType, TimestampStyle } from '../../../types/types.js';
import { cdn, emoji, timestamp } from '../../../utils/markdown.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'role',
  description: 'Views information about a role',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.Role,
      name: 'role',
      description: 'The role to view',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { role } = options;

    const guild = await api.guilds.get(interaction.guild_id!);

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            ...(role.icon
              ? ([
                  {
                    type: ComponentType.Section,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('role')} **${role.name}**\n-# ${role.id}\n\n${emoji('calendar')} **Created At:** ${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})`,
                      },
                    ],
                    accessory: {
                      type: ComponentType.Thumbnail,
                      media: {
                        url: cdn(`/role-icons/${role.id}/${role.icon}`, 4096, 'webp'),
                      },
                    },
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : ([
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('role')} **${role.name}**\n-# ${role.id}\n\n${emoji('calendar')} **Created At:** ${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.LongDate)} (${timestamp(getTimestampFromSnowflake(role.id), TimestampStyle.RelativeTime)})`,
                  },
                ] satisfies APIMessageTopLevelComponent[])),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `> Hoisted: **${role.hoist ? 'Yes' : 'No'}**\n> Position: **${role.position}/${guild.roles.length}**\n> Colors: **#${role.colors.primary_color.toString(16).padStart(6, '0')}${role.colors.secondary_color ? `, #${role.colors.secondary_color.toString(16).padStart(6, '0')}` : ''}${role.colors.tertiary_color ? `, #${role.colors.tertiary_color.toString(16).padStart(6, '0')}` : ''}**`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: `view-perms_${role.id}`,
                  label: 'View Permissions',
                  style: ButtonStyle.Secondary,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
