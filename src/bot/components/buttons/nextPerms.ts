import {
  ButtonStyle,
  ComponentType,
  MessageFlags,
  type APIMessageComponentEmoji,
  type APIMessageTopLevelComponent,
} from '@discordjs/core';
import createComponent from '../../../helpers/component.js';
import { PermissionCategories } from '../../../types/permissions.js';
import { InteractableComponentType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake, hasPermission, toEmoji } from '../../../utils/utils.js';
import { cdn, emoji, timestamp } from '../../../utils/markdown.js';
import List from '../../../utils/list.js';

createComponent({
  type: InteractableComponentType.Button,
  custom_id: 'next-perms',
  args: ['role_id', 'pointer'] as const,
  acknowledge: true,
  async run(interaction, args, api) {
    const { role_id, pointer } = args;

    const guild = await api.guilds.get(interaction.guild_id!);
    const role = await api.guilds.getRole(guild.id, role_id);

    const list = formatPermissionsByCategory().goTo(Number(pointer ?? 0));

    list.next();

    const permissions = list.current!;

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
                        url: cdn(`/icons/${interaction.guild_id}/${role.icon}`, 4096, 'webp'),
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
              type: ComponentType.TextDisplay,
              content: `### ${permissions.category}\n${Object.entries(permissions.permissions)
                .map(
                  ([name, permission]) =>
                    `${hasPermission(BigInt(role.permissions), BigInt(permission)) ? emoji('correct') : emoji('wrong')} ${name}`,
                )
                .join('\n')}`,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: `prev-perms_${role.id}_${list.pointer}`,
                  emoji: toEmoji('left') as APIMessageComponentEmoji,
                  style: ButtonStyle.Secondary,
                },
                {
                  type: ComponentType.Button,
                  custom_id: `next-perms_${role.id}_${list.pointer}`,
                  emoji: toEmoji('right') as APIMessageComponentEmoji,
                  style: ButtonStyle.Secondary,
                },
              ],
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  custom_id: `hide-perms_${role.id}_${list.pointer}`,
                  label: 'Hide Permissions',
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

function formatPermissionsByCategory() {
  return new List(
    true,
    ...Object.entries(PermissionCategories).map(([category, permissions]) => ({
      category,
      permissions,
    })),
  );
}
