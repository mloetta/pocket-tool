import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { msToApproxTime } from '../../../utils/utils.js';
import OpenAI from 'openai';
import { ChatCompletionContentPart } from 'openai/resources';
import { emoji, truncate } from '../../../utils/markdown.js';

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
    const nvidiaApiKey = env.get('nvidia_api_key', true).toString();

    if (!nvidiaApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('Exclamation')} NVIDIA API key not set`,
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

    let prompt;

    if (!message.content && !message.attachments) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('Exclamation')} Please select a valid message to ask AI about`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    } else if (message.content) {
      prompt = message.content;
    } else if (message.message_reference) {
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

    const openai = new OpenAI({ apiKey: nvidiaApiKey, baseURL: 'https://integrate.api.nvidia.com/v1' });

    let model;

    if (message.attachments.length > 0) {
      model = 'meta/llama-3.2-90b-vision-instruct';
    } else {
      model = 'meta/llama-3.3-70b-instruct';
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a friendly Discord chat bot, called Pocket Tool, designed to help people.\n- Today\'s date is ${new Date().toLocaleDateString('en-us', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n- You should always use gender neutral pronouns when possible.\n- When answering a question, be concise and to the point.\n- Try to answer with short responses. This does not apply to subjects that require more exhaustive or in-depth explanation.\n- Respond in a natural way, using Discord's supported markdown formatting.`,
        },
        {
          role: 'user',
          content: [
            ...(prompt ? ([{ type: 'text', text: prompt }] satisfies ChatCompletionContentPart[]) : []),
            ...(message.attachments && model === 'meta/llama-3.2-90b-vision-instruct'
              ? ([
                  { type: 'image_url', image_url: { url: message.attachments[0].url } },
                ] satisfies ChatCompletionContentPart[])
              : []),
          ],
        },
      ],
      max_completion_tokens: 2000,
    });

    const end = performance.now();
    const elapsed = end - start;

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${truncate(completion.choices[0].message.content!, 2000)}\n-# **${completion.model}** - Response may be inaccurate or incomplete - Took **${msToApproxTime(elapsed)}**`,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies MessageContextMenuCommand;
