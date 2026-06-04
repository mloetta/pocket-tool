import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import sharp from 'sharp';
import { emoji } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Turn to GIF',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, api) {
    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    const attachment = Object.values(message.attachments)[0];

    if (!attachment || !attachment.content_type?.startsWith('image/')) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid image to turn into a GIF`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const buffer = await makeRequest(attachment.url, {
      method: RequestMethod.GET,
      response: ResponseType.BUFFER,
    });

    const gif = await sharp(buffer).gif().toBuffer();

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      files: [
        {
          name: 'output.gif',
          data: gif,
        },
      ],
    });
  },
});
