import { ChannelType, ComponentType, MessageFlags } from '@discordjs/core';
import { Component, InteractableComponentType, TimestampStyle } from '../../../types/types.js';
import { timestamp } from '../../../utils/markdown.js';

export default {
  type: InteractableComponentType.Button,
  custom_id: `support-resolved`,
  acknowledge: true,
  async run(interaction, args, client) {
    const channel = await client.api.channels.get(interaction.channel.id);

    if (channel.type !== ChannelType.PublicThread) {
      return;
    }

    if (
      interaction.member?.user.id !== channel.owner_id &&
      !interaction.member?.roles.includes('1457033473742340211')
    ) {
      return;
    }

    const currentTags = channel.applied_tags ?? [];

    await client.api.channels.edit(channel.id, {
      archived: true,
      locked: true,
      applied_tags: [...currentTags, '1508633668514742412'],
    });

    const now = new Date();

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `### Hello, <@&1457033473742340211> will reach out to you soon!\n- Please explain exactly what your issue is\n- Provide any relevant information to help us understand your problem\n- Include any error messages or screenshots if applicable`,
        },
        {
          type: ComponentType.TextDisplay,
          content: `-# Thread has been closed ${timestamp(now.getTime(), TimestampStyle.FullDateShortTime)} (${timestamp(now.getTime(), TimestampStyle.RelativeTime)})`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies Component<InteractableComponentType.Button>;
