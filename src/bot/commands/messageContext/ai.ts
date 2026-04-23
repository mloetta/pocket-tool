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
import { icon } from '../../../utils/markdown.js';
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
    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    let content = message.content;
    if (!content) {
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

        content = `message replied to:\n${referenced.content}\noriginal message:\n${message.content}`;
      } catch (e) {
        content = message.content;
      }
    }

    const models = [
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3-32b',
    ];

    const model = models[Math.floor(Math.random() * models.length)];

    const req = await makeRequest('https://api.groq.com/openai/v1/chat/completions', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${env.get('groq_api_key', true).toString()}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: model,
        messages: [
          {
            role: 'system',
            content: `You are a friendly chat bot, called Pocket Tool, designed to help people.\n- Today\'s date is ${new Date().toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- You should always use gender neutral pronouns when possible.\n- When answering a question, be concise and to the point.\n- Try to answer with short responses. This does not apply to subjects that require more exhaustive or in-depth explanation.\n- Respond in a natural way, using Discord's supported markdown formatting.`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        max_tokens: 4000,
      },
    });

    console.log(req);

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${req.choices[0].message.content}\n-# **${req.model}** - Response may be inaccurate or incomplete.`,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies MessageContextMenuCommand;
