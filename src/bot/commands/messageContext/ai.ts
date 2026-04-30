import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import env from '../../../utils/env.js';
import { icon, stringwrapPreserveWords } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: ApplicationCommandType.Message,
  name: 'Ask AI',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, client) {
    const openRouterApiKey = env.get('open_router_api_key', true).toString();
    if (!openRouterApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} OpenRouter API key not set.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    let prompt = message.content;
    if (!prompt) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid message to ask AI about.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (message.message_reference) {
      try {
        const referenced = await client.api.channels.getMessage(
          message.message_reference.channel_id,
          message.message_reference.message_id!,
        );

        prompt = `message replied to:\n${referenced.content}\noriginal message:\n${message.content}`;
      } catch (e) {
        prompt = message.content;
      }
    }

    const start = performance.now();

    const res = await makeRequest('https://openrouter.ai/api/v1/chat/completions', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: 'openrouter/auto',
        messages: [
          {
            role: 'system',
            content: `You are a friendly Discord chat bot, called Pocket Tool, designed to help people.\n- Today\'s date is ${new Date().toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- You should always use gender neutral pronouns when possible.\n- When answering a question, be concise and to the point.\n- Try to answer with short responses. This does not apply to subjects that require more exhaustive or in-depth explanation.\n- Respond in a natural way, using Discord's supported markdown formatting.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completions_tokens: 2000,
      },
    });

    const end = performance.now();
    const elapsed = end - start;

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${stringwrapPreserveWords(res.choices[0].message.content, 2000)}\n-# **${res.model}** - Response may be inaccurate or incomplete. - Took **${formatPretty(elapsed)}**`,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies MessageContextMenuCommand;

function formatPretty(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `~${(ms / 1000).toFixed(1)}s`;
}
