import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import { Permissions } from '../../../types/permissions.js';
import { icon, pill } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { hasPermission } from '../../../utils/utils.js';

type Options = {
  users: string;
  reason?: string;
};

export default {
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
  async run(interaction, options, client) {
    const { users, reason } = options;

    if (!hasPermission(BigInt(interaction.app_permissions ?? 0), BigInt(Permissions.BAN_MEMBERS))) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Wrong)} I don't have enough permissions to softban users. I need the following permissions in this channel: ${pill('Ban Members')}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const normalize = (input: string) => input.replace(/[<@!>]/g, '');
    const userIds = users.split(', ').map((userId) => normalize(userId));

    if (
      userIds.length > 1 &&
      !hasPermission(BigInt(interaction.member?.permissions ?? 0), BigInt(Permissions.MANAGE_GUILD))
    ) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Wrong)} You don't have enough permissions to softban multiple users. You need the following permissions in this channel: ${pill('Manage Guild')}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    } else if (userIds.length >= 200) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} You can only softban up to 200 users at a time.`,
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
        await client.api.guilds.banUser(
          interaction.guild!.id,
          userId,
          { delete_message_seconds: 604800 },
          { reason: `${reason ?? ''}\nSoftban command ran by ${interaction.member?.user.username}` },
        );
        await client.api.guilds.unbanUser(interaction.guild!.id, userId, {
          reason: `Softban command ran by ${interaction.member?.user.username}`,
        });
        successfulBans.push(userId);
      } catch {
        failedBans.push(userId);
      }
    } else {
      const bulkBanResult = await client.api.guilds
        .bulkBanUsers(
          interaction.guild!.id,
          { user_ids: userIds, delete_message_seconds: 604800 },
          { reason: `${reason ?? ''}\nSoftban command ran by ${interaction.member?.user.username}` },
        )
        .catch(() => null);

      const bannedUserIds = bulkBanResult?.banned_users?.map((userId) => String(userId)) ?? [];
      const bulkFailedUserIds = bulkBanResult?.failed_users?.map((userId) => String(userId)) ?? [];

      failedBans.push(...bulkFailedUserIds);

      const unbanResults = await Promise.allSettled(
        bannedUserIds.map((userId) =>
          client.api.guilds.unbanUser(interaction.guild!.id, userId, {
            reason: `Softban command ran by ${interaction.member?.user.username}`,
          }),
        ),
      );

      unbanResults.forEach((result, index) => {
        const userId = bannedUserIds[index]!;
        if (result.status === 'fulfilled') {
          successfulBans.push(userId);
        } else {
          failedBans.push(userId);
        }
      });
    }

    const hasSuccess = successfulBans.length > 0;
    const hasFailures = failedBans.length > 0;

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${hasSuccess ? `${icon(Emoji.Correct)} Successfully softbanned ${successfulBans.map((userId) => `<@${userId}>`).join(', ')}!` : ''}${hasSuccess && hasFailures ? `\n> ${icon(Emoji.Exclamation)} Failed to softban: ${failedBans.map((userId) => `**${userId}**`).join(', ')}.` : ''}${!hasSuccess && hasFailures ? `${icon(Emoji.Exclamation)} Failed to softban: ${failedBans.map((userId) => `**${userId}**`).join(', ')}.` : ''}${!hasSuccess && !hasFailures ? `${icon(Emoji.Exclamation)} No users were softbanned.` : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
