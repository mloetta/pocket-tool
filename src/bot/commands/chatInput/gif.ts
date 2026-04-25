import {
  APIAttachment,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { makeRequest } from '../../../utils/request.js';
import sharp from 'sharp';

type Options = {
  image: APIAttachment;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'gif',
  description: 'Turn an image into a GIF',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Attachment,
      name: 'image',
      description: 'The image to turn into a GIF',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { image } = options;

    if (!image || !image.content_type?.startsWith('image/')) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please provide a valid image to turn into a GIF.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const buffer = await makeRequest(image.url, {
      method: RequestMethod.GET,
      response: ResponseType.BUFFER,
    });

    const gif = await sharp(buffer).gif().toBuffer();

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      files: [
        {
          name: 'output.gif',
          data: gif,
        },
      ],
    });
  },
} satisfies ChatInputCommand<Options>;
