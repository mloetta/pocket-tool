import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core';
import { ChatInputCommand } from '../../../types/types.js';

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'ping',
  description: 'Pong!',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, client) {
    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: 'Pong!',
    });
  },
} satisfies ChatInputCommand;
