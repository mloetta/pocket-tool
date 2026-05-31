import { ComponentType, GuildFeature } from '@discordjs/core';
import { Component, InteractableComponentType } from '../../../types/types.js';
import { emoji, highlight } from '../../../utils/markdown.js';

const args = ['guildId'] as const;

export default {
  type: InteractableComponentType.Button,
  custom_id: `guild-features`,
  args,
  async run({ data: interaction, api, shardId }, args, client) {
    const { guildId } = args;

    const guild = await api.guilds.get(guildId);

    const features = guild.features;
    const allFeatures = Object.values(GuildFeature);

    const featureList = allFeatures.map((feature) => {
      const hasFeature = features.includes(feature);

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
} satisfies Component<InteractableComponentType.Button, typeof args>;
