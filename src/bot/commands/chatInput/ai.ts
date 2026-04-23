import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import env from '../../../utils/env.js';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  prompt: string;
  model?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'ai',
  description: 'Ask AI anything you want!',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'prompt',
      description: 'The prompt to send to the AI',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'model',
      description: 'The model to use for the AI',
      required: false,
      choices: [
        {
          name: 'llama-3.1-8b-instant',
          value: 'llama-3.1-8b-instant',
        },
        {
          name: 'llama-3.3-70b-versatile',
          value: 'llama-3.3-70b-versatile',
        },
        {
          name: 'meta-llama/llama-4-scout-17b-16e-instruct',
          value: 'meta-llama/llama-4-scout-17b-16e-instruct',
        },
        {
          name: 'openai/gpt-oss-120b',
          value: 'openai/gpt-oss-120b',
        },
        {
          name: 'openai/gpt-oss-20b',
          value: 'openai/gpt-oss-20b',
        },
        {
          name: 'qwen/qwen3-32b',
          value: 'qwen/qwen3-32b',
        },
      ],
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { prompt, model } = options;

    const groqApiKey = env.get('groq_api_key', true).toString();
    if (!groqApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Groq API key not set.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const req = await makeRequest('https://api.groq.com/openai/v1/chat/completions', {
      method: RequestMethod.POST,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: model ?? 'llama-3.1-8b-instant',
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
        max_tokens: 4000,
      },
    });

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
} satisfies ChatInputCommand<Options>;
