import { GatewayDispatchEvents } from '@discordjs/core';
import { getSubscription, unsubscribe } from '../../utils/subscription.js';
import env from '../../utils/env.js';
import createGatewayEvent from '../../helpers/event.js';

const botId = atob(env.get('token').toString().split('.')[0]!);

createGatewayEvent({
  name: GatewayDispatchEvents.VoiceStateUpdate,
  async run(voiceState, api) {
    if (!voiceState.guild_id) {
      return;
    }

    const subscription = getSubscription(voiceState.guild_id);
    if (!subscription) {
      return;
    }

    const botChannelId = subscription.voiceConnection.joinConfig.channelId;

    if (voiceState.user_id === botId) {
      return;
    }

    if (voiceState.channel_id !== botChannelId) {
      if (!subscription.timeout) {
        subscription.timeout = setTimeout(() => {
          const current = getSubscription(voiceState.guild_id!);
          if (current) {
            unsubscribe(voiceState.guild_id!);
            current.voiceConnection.destroy();
          }
          subscription.timeout = null;
        }, 60 * 1000);
      }
    } else {
      if (subscription.timeout) {
        clearTimeout(subscription.timeout);
        subscription.timeout = null;
      }
    }
  },
});
