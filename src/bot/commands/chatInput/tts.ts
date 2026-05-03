import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { icon, pill, stringwrapPreserveWords, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { supabase } from '../../../utils/supabase.js';

type Options = {
  text: string;
  voice?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'tts',
  description: 'Convert text to speech',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'text',
      description: 'The text to convert to speech',
      max_length: 500,
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'voice',
      description: 'The voice to use for TTS',
      required: false,
      choices: [
        {
          name: 'Male',
          value: 'ZEBslWM12xCQWILoQtiP',
        },
        {
          name: 'Female',
          value: 'nf4MCGNSdM0hxM95ZBQR',
        },
        {
          name: 'Neutral',
          value: 'M563YhMmA0S8vEYwkgYa',
        },
      ],
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 10,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { text, voice } = options;

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

    if (useAmount >= 15) {
      const resetTime = (lastReset ?? now) + msIn24h;

      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} You have used your daily limit of ${pill(15)} TTS requests. Try again ${timestamp(Math.floor(resetTime / 1000), TimestampStyle.RelativeTime)}`,
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

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'M563YhMmA0S8vEYwkgYa', {
      text,
      modelId: 'eleven_flash_v2_5',
      outputFormat: 'opus_48000_192',
    });

    const buffer = Buffer.from(audio.audioBase64, 'base64');

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      attachments: [
        {
          id: 0,
          filename: 'tts.opus',
          waveform: 'AAAAAA==', // anything that starts w a base64 works
          duration_secs: 1, // discord automatically sets this
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
} satisfies ChatInputCommand<Options>;
