import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type Snowflake,
} from '@discordjs/core';
import { HighlightStyle, RateLimitType } from '../../../types/types.js';
import { Permissions } from '../../../types/permissions.js';
import { hasPermission } from '../../../utils/utils.js';
import { emoji, highlight } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'purge',
  description: 'Removes recent messages in chat',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.Integer,
      name: 'amount',
      description: 'The number of messages to purge',
      required: true,
      max_value: 100,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'content',
      description: 'The content of the messages to purge',
      required: false,
    },
  ],
  default_member_permissions: Permissions.MANAGE_MESSAGES,
  rate_limit: {
    type: RateLimitType.Channel,
    cooldown: 10,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { amount, content } = options;

    if (!hasPermission(BigInt(interaction.app_permissions ?? 0), BigInt(Permissions.MANAGE_MESSAGES))) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('wrong')} I don't have enough permissions to purge messages - I need the following permissions in <#${interaction.channel.id}>: ${highlight('Manage Messages', HighlightStyle.Bold)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const originalResponse = await api.interactions.getOriginalReply(interaction.application_id, interaction.token);

    const messages = await api.channels.getMessages(interaction.channel.id, { limit: amount + 1 });

    let deleteIds: Snowflake[] = [];

    messages.forEach((message) => {
      if (message.id === originalResponse.id) return;

      if (content) {
        if (new Date().getTime() - new Date(message.timestamp).getTime() <= 1209000000) {
          if (message.content.includes(content)) {
            deleteIds.push(message.id);
          }
        }
      } else {
        if (new Date().getTime() - new Date(message.timestamp).getTime() <= 1209000000) {
          deleteIds.push(message.id);
        }
      }
    });

    if (deleteIds.length === 0) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} No messages found matching the given criteria`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    deleteIds.length === 1
      ? await api.channels.deleteMessage(interaction.channel.id, deleteIds[0]!, {
          reason: `Purge command ran by ${interaction.member?.user.username}`,
        })
      : await api.channels.bulkDeleteMessages(interaction.channel.id, deleteIds, {
          reason: `Purge command ran by ${interaction.member?.user.username}`,
        });

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('correct')} Successfully purged ${highlight(deleteIds.length)} message${deleteIds.length !== 1 ? 's' : ''}${content ? ` with content ${highlight(content)}` : ''}.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
