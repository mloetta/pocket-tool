import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'ping',
  description: 'Pong!',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, api) {
    await api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `Pong!`,
    });
  },
});
