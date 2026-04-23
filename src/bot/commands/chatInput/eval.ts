import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import util from 'util';
import { ChatInputCommand } from '../../../types/types.js';
import { codeblock, stringwrap } from '../../../utils/markdown.js';

type Options = {
  code: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'eval',
  description: 'Evaluates the provided code',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'code',
      description: 'The code to evaluate',
      required: true,
    },
  ],
  guild: '1457032144349302900',
  dev: true,
  acknowledge: true,
  async run(interaction, options, client) {
    const { code } = options;

    let result;
    try {
      result = eval(code);
    } catch (e) {
      result = e;
    }

    let value = result;

    if (result && typeof result.then === 'function') {
      try {
        value = await result;
      } catch (e) {
        value = e;
      }
    }

    const formatted = typeof value === 'string' ? value : util.inspect(value);

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: codeblock('ts', stringwrap(formatted, 1985)),
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
