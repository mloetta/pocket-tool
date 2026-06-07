import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { HighlightStyle, RateLimitType } from '../../../types/types.js';
import { Permissions } from '../../../types/permissions.js';
import { hasPermission } from '../../../utils/utils.js';
import { emoji, highlight } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'softban',
  description: 'Bans a user and unbans them immediately',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'users',
      description: 'The user or users to softban (comma-separated)',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'reason',
      description: 'The reason for the softban',
      required: false,
    },
  ],
  default_member_permissions: Permissions.BAN_MEMBERS,
  rate_limit: {
    type: RateLimitType.Guild,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { users, reason } = options;

    if (!hasPermission(BigInt(interaction.app_permissions ?? 0), BigInt(Permissions.BAN_MEMBERS))) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('wrong')} I don't have enough permissions to softban users - I need the following permissions in this guild: ${highlight('Ban Members', HighlightStyle.Bold)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const userIds = (users.match(/<@!?(\d+)>|\b\d{15,25}\b/g) || []).map((u) => u.replace(/[<@!>]/g, ''));

    if (
      userIds.length > 1 &&
      !hasPermission(BigInt(interaction.member?.permissions ?? 0), BigInt(Permissions.MANAGE_GUILD))
    ) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('wrong')} You don't have enough permissions to softban multiple users - You need the following permissions in this guild: ${highlight('Manage Guild', HighlightStyle.Bold)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    } else if (userIds.length >= 200) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} You can only softban up to 200 users at a time`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const successfulBans: string[] = [];
    const failedBans: string[] = [];

    if (userIds.length === 1) {
      const userId = userIds[0];
      try {
        await api.guilds.banUser(
          interaction.guild!.id,
          userId,
          { delete_message_seconds: 604800 },
          { reason: `${reason ?? ''}\nSoftban command ran by ${interaction.member?.user.username}` },
        );
        await api.guilds.unbanUser(interaction.guild!.id, userId, {
          reason: `Softban command ran by ${interaction.member?.user.username}`,
        });
        successfulBans.push(userId);
      } catch {
        failedBans.push(userId);
      }
    } else {
      const bulkBanResult = await api.guilds
        .bulkBanUsers(
          interaction.guild!.id,
          { user_ids: userIds, delete_message_seconds: 604800 },
          { reason: `${reason ?? ''}\nSoftban command ran by ${interaction.member?.user.username}` },
        )
        .catch(() => null);

      const bulkSuccesfullUserIds = (bulkBanResult?.banned_users ?? []).map(String);
      const bulkFailedUserIds = (bulkBanResult?.failed_users ?? []).map(String);

      failedBans.push(...bulkFailedUserIds);

      const unbanResults = await Promise.allSettled(
        bulkSuccesfullUserIds.map((userId) =>
          api.guilds.unbanUser(interaction.guild!.id, userId, {
            reason: `Softban command ran by ${interaction.member?.user.username}`,
          }),
        ),
      );

      unbanResults.forEach((result, index) => {
        const userId = bulkSuccesfullUserIds[index]!;
        if (result.status === 'fulfilled') {
          successfulBans.push(userId);
        } else {
          failedBans.push(userId);
        }
      });
    }

    const hasSuccess = successfulBans.length > 0;
    const hasFailures = failedBans.length > 0;

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${hasSuccess ? `${emoji('correct')} Successfully softbanned ${successfulBans.map((userId) => `<@${userId}>`).join(', ')}!` : ''}${hasSuccess && hasFailures ? `\n-# ${emoji('wrong')} Failed to softban: ${failedBans.map((userId) => `<@${userId}>`).join(', ')}` : ''}${!hasSuccess && hasFailures ? `${emoji('wrong')} Failed to softban: ${failedBans.map((userId) => `<@${userId}>`).join(', ')}` : ''}${!hasSuccess && !hasFailures ? `${emoji('exclamation')} No users were softbanned` : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
