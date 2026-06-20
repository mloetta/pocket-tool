import { API, ComponentType, GatewayDispatchEvents, MessageFlags, type GatewayMessageCreateDispatchData } from '@discordjs/core';
import { supabase } from '../../utils/supabase.js';
import { msToReadableTime, toReactionEmoji } from '../../utils/utils.js';
import createGatewayEvent from '../../helpers/event.js';
import { emoji, highlight } from '../../utils/markdown.js';
import { HighlightStyle } from '../../types/types.js';

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

    if (error) throw error;

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

    if (!mentions.length) return;

    const { data: mentionData, error: mentionError } = await supabase.from('afk').select('*').in('user_id', mentions);

    if (mentionError) throw mentionError;

    if (!mentionData?.length) return;

    await api.channels.createMessage(message.channel_id, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: mentionData.map((u) => `<@${u.user_id}> is currently afk${u.reason ? `\n-# ${u.reason}` : ''}`).join('\n'),
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
  async (message, api) => {
    const botId = (await api.applications.getCurrent()).id;

    if (message.content !== `<@${botId}>`) return;

    await api.channels.createMessage(message.channel_id, {
      content: `Hello! I'm **Pocket Tool**!\nYou can view all the available slash commands by typing ${highlight('/', HighlightStyle.Bold)}\n-# Additionally, you can view context menu commands by right-clicking or long-pressing a message or user`,
      message_reference: {
        message_id: message.id,
      },
    });
  },
  async (message, api) => {
    if (message.author.bot) return;

    const isNumber = /^\d+$/.test(message.content.trim());

    if (!isNumber) return;

    const { data, error } = await supabase.from('counting').select('*').eq('guild_id', message.guild_id).maybeSingle();

    if (error) throw error;

    if (!data) return;

    if (message.channel_id !== data.channel_id) return;

    if (!data.extras?.includes('consecutive_counts') && data.last_user === message.author.id) {
      await api.channels.addMessageReaction(message.channel_id, message.id, toReactionEmoji('exclamation'));

      return;
    }

    const number = parseInt(message.content.trim(), 10);
    const expected = data.current_count + 1;
    const isCorrect = number === expected;

    if (!isCorrect) {
      switch (data.action) {
        case 'restarts': {
          await supabase.from('counting').update({ current_count: 0, last_user: null }).eq('guild_id', message.guild_id);

          await api.channels.addMessageReaction(message.channel_id, message.id, toReactionEmoji('wrong'));
          break;
        }
        case 'do_nothing': {
          await api.channels.addMessageReaction(message.channel_id, message.id, toReactionEmoji('wrong'));
          break;
        }
      }

      if (data.extras?.includes('notify')) {
        await api.channels.createMessage(message.channel_id, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('wrong')} Incorrect number provided, the expected number was: ${highlight(expected, HighlightStyle.Bold)}${data.action === 'restarts' ? `- starting over!` : ''}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
          message_reference: {
            message_id: message.id,
          },
        });
      }
    } else {
      await supabase.from('counting').update({ current_count: number, last_user: message.author.id }).eq('guild_id', message.guild_id);

      await api.channels.addMessageReaction(message.channel_id, message.id, toReactionEmoji('correct'));
    }
  },
];
