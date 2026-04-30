import { ComponentType, GuildFeature } from '@discordjs/core';
import { Component, InteractableComponentType } from '../../../types/types.js';
import { icon, pill } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

const args = ['guildId'] as const;

export default {
  type: InteractableComponentType.Button,
  custom_id: `guild-features`,
  args,
  async run(interaction, args, client) {
    const { guildId } = args;

    const guild = await client.api.guilds.get(guildId);

    const features = guild.features;
    const allFeatures = Object.values(GuildFeature);

    const featureList = allFeatures.map((feature) => {
      const hasFeature = features.includes(feature);

      return `${pill(feature)} ${hasFeature ? icon(Emoji.Correct) : icon(Emoji.Wrong)}`;
    });

    await client.api.interactions.createModal(interaction.id, interaction.token, {
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
