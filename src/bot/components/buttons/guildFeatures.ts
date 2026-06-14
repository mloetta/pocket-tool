import { ComponentType, GuildFeature } from '@discordjs/core';
import { InteractableComponentType } from '../../../types/types.js';
import { emoji, highlight } from '../../../utils/markdown.js';
import createComponent from '../../../helpers/component.js';

createComponent({
  type: InteractableComponentType.Button,
  custom_id: `guild-features`,
  async run(interaction, args, api) {
    const guild = await api.guilds.get(interaction.guild_id!);

    const features = guild.features;
    const allFeatures = Object.values(GuildFeature);

    const featureList = allFeatures.map((f) => {
      const hasFeature = features.includes(f);

      return `${highlight(feature)} ${hasFeature ? emoji('correct') : emoji('wrong')}`;
    });

    await api.interactions.createModal(interaction.id, interaction.token, {
      title: `Guild Features`,
      custom_id: `guild-features-modal`,
      components: [
        {
          type: ComponentType.TextDisplay,
          content: featureList.join('\n'),
        },
      ],
    });
  },
});
