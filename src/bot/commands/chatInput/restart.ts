import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core';
import { ChatInputCommand } from '../../../types/types.js';

// host does the hard work !!
export default {
  type: ApplicationCommandType.ChatInput,
  name: 'restart',
  description: 'Restart the bot',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  guild: '1457032144349302900',
  dev: true,
  acknowledge: true,
  async run(interaction, options, client) {
    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: 'Restarting...',
    });
    setTimeout(() => {
      process.exit();
    }, 1000);
  },
} satisfies ChatInputCommand;
