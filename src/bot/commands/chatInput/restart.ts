import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';

// host does the hard work !!
createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'restart',
  description: 'Restart the bot',
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  guild: '1457032144349302900',
  dev: true,
  acknowledge: true,
  async run(interaction, options, api) {
    await api.interactions.editReply(interaction.application_id, interaction.token, {
      content: 'Restarting...',
    });
    setTimeout(() => {
      process.exit();
    }, 1000);
  },
});
