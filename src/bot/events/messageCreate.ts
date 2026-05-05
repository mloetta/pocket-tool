import { ComponentType, GatewayDispatchEvents, MessageFlags } from '@discordjs/core';
import { GatewayEvent } from '../../types/types.js';
import { supabase } from '../../utils/supabase.js';
import { msToReadableTime } from '../../utils/utils.js';

export default {
  name: GatewayDispatchEvents.MessageCreate,
  async run(message, client) {
    const { data: afkData, error: afkError } = await supabase
      .from('afk')
      .select('*')
      .eq('user_id', message.author.id)
      .maybeSingle();

    if (afkError) {
      throw afkError;
    }

    if (afkData) {
      await supabase.from('afk').delete().eq('user_id', message.author.id);

      await client.api.channels.createMessage(message.channel_id, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `Welcome back, <@${message.author.id}>! You were away for **${msToReadableTime(Date.now() - new Date(afkData.went_away).getTime())}**.`,
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
          .filter((userId) => userId !== message.author.id) ?? [],
      ),
    ];

    if (mentions.length === 0) {
      return;
    }

    const { data: afkMentionData, error: afkMentionError } = await supabase
      .from('afk')
      .select('*')
      .in('user_id', mentions);

    if (afkMentionError) {
      throw afkMentionError;
    }

    if (!afkMentionData?.length) {
      return;
    }

    await client.api.channels.createMessage(message.channel_id, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: afkMentionData
            .map((user) => `<@${user.user_id}> is currently afk.${user.reason ? `\n-# ${user.reason}` : ''}`)
            .join('\n'),
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies GatewayEvent<GatewayDispatchEvents.MessageCreate>;
