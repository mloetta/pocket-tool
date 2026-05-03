import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  Snowflake,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import { Permissions } from '../../../types/permissions.js';
import { icon, pill, smallPill } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { hasPermission } from '../../../utils/utils.js';

type Options = {
  amount: number;
  content?: string;
};

export default {
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
  async run(interaction, options, client) {
    const { amount, content } = options;

    if (!hasPermission(BigInt(interaction.app_permissions ?? 0), BigInt(Permissions.MANAGE_MESSAGES))) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Wrong)} I don't have enough permissions to purge messages. I need the following permissions in this channel: ${pill('Manage Messages')}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const originalResponse = await client.api.interactions.getOriginalReply(
      interaction.application_id,
      interaction.token,
    );

    const messages = await client.api.channels.getMessages(interaction.channel.id, { limit: amount + 1 });

    let deleteIds: Snowflake[] = [];

    messages.forEach((message) => {
      if (message.id === originalResponse.id) return;

      if (content) {
        if (Date.now() - new Date(message.timestamp).getTime() <= 1209000000) {
          if (message.content.includes(content)) {
            deleteIds.push(message.id);
          }
        }
      } else {
        if (Date.now() - new Date(message.timestamp).getTime() <= 1209000000) {
          deleteIds.push(message.id);
        }
      }
    });

    if (deleteIds.length === 0) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} No messages found matching the given criteria.`,
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
      ? await client.api.channels.deleteMessage(interaction.channel.id, deleteIds[0], {
          reason: `Purge command ran by ${interaction.member?.user.username}`,
        })
      : await client.api.channels.bulkDeleteMessages(interaction.channel.id, deleteIds, {
          reason: `Purge command ran by ${interaction.member?.user.username}`,
        });

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Correct)} Successfully purged ${pill(deleteIds.length)} message${deleteIds.length !== 1 ? 's' : ''}${content ? ` with content ${smallPill(content)}` : ''}.`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
