import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../../../utils/env.js';
import { icon, pill, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { supabase } from '../../../utils/supabase.js';

export default {
  type: ApplicationCommandType.Message,
  name: 'Text to Speech',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, client) {
    const elevenLabsApiKey = env.get('eleven_labs_api_key', true).toString();

    if (!elevenLabsApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Eleven Labs API key not set.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    const content = message.content;

    if (!content) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid message to convert to speech.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const { data, error } = await supabase
      .from('tts')
      .select('*')
      .eq('user_id', (interaction.user?.id ?? interaction.member?.user.id)!)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const now = Date.now();
    const msIn24h = 24 * 60 * 60 * 1000;

    let useAmount = data?.use_amount ?? 0;

    const lastReset = data?.last_used ? new Date(data.last_used).getTime() : null;
    const within24h = lastReset !== null && now - lastReset < msIn24h;

    if (!within24h) {
      useAmount = 0;
    }

    if (useAmount >= 10) {
      const resetTime = (lastReset ?? now) + msIn24h;

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} You have used your daily limit of ${pill(10)} TTS requests. Try again ${timestamp(Math.floor(resetTime / 1000), TimestampStyle.RelativeTime)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps('M563YhMmA0S8vEYwkgYa', {
      text: content,
      modelId: 'eleven_v3',
      outputFormat: 'opus_48000_192',
    });

    const buffer = Buffer.from(audio.audioBase64, 'base64');

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      attachments: [
        {
          id: 0,
          filename: 'tts.opus',
          waveform: 'AAAAAA==', // discord automatically sets that
          duration_secs: 1, // discord also sets that
        },
      ],
      files: [
        {
          name: 'tts.opus',
          data: buffer,
        },
      ],
      flags: MessageFlags.IsVoiceMessage,
    });

    await supabase.from('tts').upsert({
      user_id: interaction.user?.id ?? interaction.member?.user.id,
      use_amount: useAmount + 1,
      last_used: new Date().toISOString(),
    });
  },
} satisfies MessageContextMenuCommand;
