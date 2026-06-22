import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { HighlightStyle, RateLimitType, TimestampStyle } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { emoji, highlight, timestamp } from '../../../utils/markdown.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { hasPermission } from '../../../utils/utils.js';
import { Permissions } from '../../../types/permissions.js';
import { supabase } from '../../../utils/supabase.js';
import { Locale } from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { getChatInputFocusedOption, linkdave } from '../../index.js';
import { constructUri, EventName } from 'linkdave';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'tts',
  description: 'Converts text to speech',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'speak',
      description: 'If you want the bot to speak the text in a voice channel',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'text',
          description: 'The text to convert to speech',
          required: true,
          max_length: 500,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'voice',
          description: 'The voice to use for TTS',
          choices: [
            { name: 'Male', value: 'UgBBYS2sOqTuMpoF3BR0' },
            { name: 'Female', value: 'nf4MCGNSdM0hxM95ZBQR' },
            { name: 'Neutral', value: 'M563YhMmA0S8vEYwkgYa' },
          ],
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'language',
          description: 'The language of the TTS (auto for discord locale)',
          required: false,
          autocomplete: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'file',
      description: 'If you want the bot to send the tts as a voice message',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'text',
          description: 'The text to convert to speech',
          required: true,
          max_length: 500,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'voice',
          description: 'The voice to use for TTS',
          choices: [
            { name: 'Male', value: 'UgBBYS2sOqTuMpoF3BR0' },
            { name: 'Female', value: 'nf4MCGNSdM0hxM95ZBQR' },
            { name: 'Neutral', value: 'M563YhMmA0S8vEYwkgYa' },
          ],
          required: false,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'language',
          description: 'The language of the TTS (auto for discord locale)',
          required: false,
          autocomplete: true,
        },
      ],
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async autocomplete(interaction, api) {
    const focused = getChatInputFocusedOption(interaction.data.options);
    const value = String(focused?.value).toLowerCase() ?? '';

    const choices = [
      {
        name: 'Auto',
        value: 'auto',
      },
      ...Object.entries(Locale).map(([key, value]) => ({
        name: key,
        value,
      })),
    ]
      .filter((c) => c.name.toLowerCase().includes(value))
      .slice(0, 25);

    await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
  },
  async run(interaction, options, api) {
    const { speak, file } = options;

    if (speak) {
      const { text, voice, language } = speak;

      const elevenLabsApiKey = env.get('eleven_labs_api_key', true).toString();

      if (!elevenLabsApiKey) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} Eleven Labs API key not set`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (!interaction.guild_id || !interaction.member?.user.id) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You must be in a guild to use this option`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const userVoiceState = await api.voice.getUserVoiceState(interaction.guild_id, interaction.member.user.id).catch(() => null);

      if (!userVoiceState || !userVoiceState.channel_id) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You must be in a voice channel to use this option`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (
        !hasPermission(BigInt(interaction.app_permissions), BigInt(Permissions.CONNECT)) ||
        !hasPermission(BigInt(interaction.app_permissions), BigInt(Permissions.SPEAK))
      ) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('wrong')} I don't have enough permissions to play TTS audios - I need the following permission in this channel: ${highlight('Connect', HighlightStyle.Bold)} and ${highlight('Speak', HighlightStyle.Bold)}`,
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
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .maybeSingle();

      if (error) throw error;

      const now = new Date().getTime();
      const msIn24h = 24 * 60 * 60 * 1000;

      let useAmount = data?.use_amount ?? 0;

      const lastReset = data?.last_used ? new Date(data.last_used).getTime() : null;
      const within24h = lastReset !== null && now - lastReset < msIn24h;

      if (!within24h) {
        useAmount = 0;
      }

      if (useAmount >= 50) {
        const resetTime = (lastReset ?? now) + msIn24h;

        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You have used your daily limit of ${highlight(50, HighlightStyle.Bold)} TTS requests - please try again ${timestamp(Math.floor(resetTime / 1000), TimestampStyle.RelativeTime)}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const player = linkdave.getPlayer(interaction.guild_id);

      if (player.connected && player.voiceChannelId !== userVoiceState.channel_id && player.playing) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} I'm currently speaking in another channel`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (!player.connected || player.voiceChannelId !== userVoiceState.channel_id) {
        await player.connect(userVoiceState.channel_id);
      }

      const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

      const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'M563YhMmA0S8vEYwkgYa', {
        text: `${interaction.member.nick ?? interaction.member.user.global_name ?? interaction.member.user.username} said: ${text}`,
        languageCode: !language || language === 'auto' ? interaction.locale.split('-')[0]! : language.split('-')[0]!,
        modelId: 'eleven_flash_v2_5',
        outputFormat: 'mp3_44100_128',
      });

      const buffer = Buffer.from(audio.audioBase64, 'base64');

      const fileName = `${interaction.id}-${Date.now()}.mp3`;

      const { error: uploadError } = await supabase.storage.from('tts').upload(fileName, buffer, { contentType: 'audio/mpeg' });

      if (uploadError) throw uploadError;

      const { data: cache } = supabase.storage.from('tts').getPublicUrl(fileName);

      const onTrackEnd = async (payload: any) => {
        if (payload.guild_id !== interaction.guild_id) return;

        linkdave.off(EventName.TrackEnd, onTrackEnd);

        const { error } = await supabase.storage.from('tts').remove([fileName]);

        if (error) throw error;
      };

      linkdave.on(EventName.TrackEnd, onTrackEnd);

      player.queue.add(cache.publicUrl);

      if (!player.playing) {
        await player.queue.start();
      }

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} Text-to-Speech request added to queue`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      await supabase.from('tts').upsert({
        user_id: interaction.member.user.id,
        use_amount: useAmount + 1,
        last_used: new Date(),
      });
    } else if (file) {
      const { text, voice, language } = file;

      const elevenLabsApiKey = env.get('eleven_labs_api_key', true).toString();

      if (!elevenLabsApiKey) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} Eleven Labs API key not set`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      if (
        !hasPermission(BigInt(interaction.app_permissions), BigInt(Permissions.SEND_VOICE_MESSAGES)) ||
        !hasPermission(BigInt(interaction.app_permissions), BigInt(Permissions.ATTACH_FILES))
      ) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('wrong')} I don't have enough permissions to send TTS files - I need either the ${highlight('Send Voice Messages', HighlightStyle.Bold)} or ${highlight('Attach Files', HighlightStyle.Bold)} permission in this channel`,
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
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .maybeSingle();

      if (error) throw error;

      const now = new Date().getTime();
      const msIn24h = 24 * 60 * 60 * 1000;

      let useAmount = data?.use_amount ?? 0;

      const lastReset = data?.last_used ? new Date(data.last_used).getTime() : null;
      const within24h = lastReset !== null && now - lastReset < msIn24h;

      if (!within24h) {
        useAmount = 0;
      }

      if (
        useAmount >= 50 &&
        !env
          .get('dev_ids')
          .toArray()
          .includes(interaction.user?.id ?? interaction.member?.user.id)
      ) {
        const resetTime = (lastReset ?? now) + msIn24h;

        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You have used your daily limit of ${highlight(50, HighlightStyle.Bold)} TTS requests - please try again ${timestamp(Math.floor(resetTime), TimestampStyle.RelativeTime)}`,
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
        languageCode: !language || language === 'auto' ? interaction.locale.split('-')[0]! : language.split('-')[0]!,
        modelId: 'eleven_flash_v2_5',
        outputFormat: 'opus_48000_192',
      });

      const buffer = Buffer.from(audio.audioBase64, 'base64');

      if (hasPermission(BigInt(interaction.app_permissions), BigInt(Permissions.SEND_VOICE_MESSAGES))) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          attachments: [
            {
              id: 0,
              filename: 'tts.opus',
              waveform: 'AAAAAA==',
              duration_secs: 1,
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
      } else {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          files: [
            {
              name: 'tts.opus',
              data: buffer,
            },
          ],
        });
      }

      await supabase.from('tts').upsert({
        user_id: interaction.user?.id ?? interaction.member?.user.id,
        use_amount: useAmount + 1,
        last_used: new Date(),
      });
    }
  },
});
