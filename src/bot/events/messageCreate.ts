import {
  API,
  ComponentType,
  GatewayDispatchEvents,
  GatewayMessageCreateDispatchData,
  MessageFlags,
} from '@discordjs/core';
import { supabase } from '../../utils/supabase.js';
import { msToReadableTime } from '../../utils/utils.js';
import createGatewayEvent from '../../helpers/event.js';

type Handler = (message: GatewayMessageCreateDispatchData, api: API) => Promise<void>;

createGatewayEvent({
  name: GatewayDispatchEvents.MessageCreate,
  async run(message, api) {
    await Promise.all(handlers.map((h) => h(message, api)));
  },
});

const handlers: Handler[] = [
  async (message, api) => {
    const { data, error } = await supabase.from('afk').select('*').eq('user_id', message.author.id).maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      await supabase.from('afk').delete().eq('user_id', message.author.id);

      await api.channels.createMessage(message.channel_id, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `Welcome back, <@${message.author.id}>! You were away for **${msToReadableTime(Date.now() - new Date(data.went_away).getTime())}**.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const mentions = [
      ...new Set(
        message.content
          .match(/<@!?(\d+)>/g)
          ?.map((m) => m.replace(/\D/g, ''))
          .filter((id) => id !== message.author.id) ?? [],
      ),
    ];

    if (!mentions.length) {
      return;
    }

    const { data: mentionData, error: mentionError } = await supabase.from('afk').select('*').in('user_id', mentions);

    if (mentionError) {
      throw mentionError;
    }

    if (!mentionData?.length) {
      return;
    }

    await api.channels.createMessage(message.channel_id, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: mentionData
            .map((u) => `<@${u.user_id}> is currently afk${u.reason ? `\n-# ${u.reason}` : ''}`)
            .join('\n'),
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
];
