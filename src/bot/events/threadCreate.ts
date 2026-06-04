import { ButtonStyle, ChannelType, ComponentType, GatewayDispatchEvents, MessageFlags } from '@discordjs/core';
import createGatewayEvent from '../../helpers/event.js';

createGatewayEvent({
  name: GatewayDispatchEvents.ThreadCreate,
  async run(thread, api) {
    if (!thread.newly_created) {
      return;
    }

    const parent = await api.channels.get(thread.parent_id!);

    if (parent.type === ChannelType.GuildForum && parent.id === '1457038318045888646') {
      const message = await api.channels.createMessage(thread.id, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `### Hello, <@&1457033473742340211> will reach out to you soon!\n- Please explain exactly what your issue is\n- Provide any relevant information to help us understand your problem\n- Include any error messages or screenshots if applicable`,
          },
          {
            type: ComponentType.Section,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: 'Issue solved? Click the button to close this thread',
              },
            ],
            accessory: {
              type: ComponentType.Button,
              custom_id: 'support-resolved',
              label: 'Mark as Resolved!',
              style: ButtonStyle.Secondary,
            },
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      await api.channels.pinMessage(message.channel_id, message.id);
    }
  },
});
