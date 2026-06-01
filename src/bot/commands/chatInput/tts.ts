import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ChannelType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, HighlightStyle, RateLimitType, TimestampStyle } from '../../../types/types.js';
import env from '../../../utils/env.js';
import { emoji, highlight, timestamp } from '../../../utils/markdown.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { AudioPlayerStatus, joinVoiceChannel, VoiceConnectionStatus } from '@discordjs/voice';
import { getPermissionsFor, hasPermission } from '../../../utils/utils.js';
import { Permissions } from '../../../types/permissions.js';
import { getSubscription, subscribe, TTS, unsubscribe } from '../../../utils/subscription.js';
import { supabase } from '../../../utils/supabase.js';
import { Locale } from '@discordjs/core';

type Options = {
  speak: {
    text: string;
    voice?: string;
    language?: string;
  };
  file: {
    text: string;
    voice?: string;
    language?: string;
  };
};

export default {
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
            { name: 'Mommy', value: '5BX0dyTd6iq3fuD6Kuf1' },
            { name: 'h', value: 'S0o3L7a2j0fXPOSqqHkq' },
            { name: 'Toki', value: 'ntGc9TzXh1235N5w2Pf3' },
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
            { name: 'Mommy', value: '5BX0dyTd6iq3fuD6Kuf1' },
            { name: 'h', value: 'S0o3L7a2j0fXPOSqqHkq' },
            { name: 'Toki', value: 'ntGc9TzXh1235N5w2Pf3' },
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
  async autocomplete({ data: interaction, api, shardId }, client) {
    const subcommand = interaction.data.options.find((o) => 'options' in o);
    const options = subcommand && 'options' in subcommand ? subcommand.options : interaction.data.options;
    const option = options?.find((o) => 'focused' in o && o.focused);
    const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

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
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
  },
  async run({ data: interaction, api, shardId }, options, client) {
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

      const { data, error } = await supabase
        .from('tts')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

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
              content: `${emoji('exclamation')} You have used your daily limit of ${highlight(50, HighlightStyle.Bold)} TTS requests\n-# Try again ${timestamp(Math.floor(resetTime / 1000), TimestampStyle.RelativeTime)}`,
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

      const userVoiceState = await api.voice
        .getUserVoiceState(interaction.guild_id, interaction.member.user.id)
        .catch(() => null);

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

      const bot = await api.guilds.getMember(interaction.guild_id, interaction.application_id);
      const channel = await api.channels.get(userVoiceState.channel_id);

      if (channel.type !== ChannelType.GuildVoice) return;

      const guildRoles = await api.guilds.getRoles(interaction.guild_id);
      const roles = guildRoles.filter((role) => bot.roles.includes(role.id));
      const perms = getPermissionsFor(bot, channel, roles);

      if (!hasPermission(perms, BigInt(Permissions.CONNECT)) || !hasPermission(perms, BigInt(Permissions.SPEAK))) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('wrong')} I don't have enough permissions to text-to-speech. I need the following permissions in this guild: ${highlight('Connect, Speak', HighlightStyle.Bold)}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      let subscription = getSubscription(interaction.guild_id);

      if (subscription) {
        const botChannelId = subscription.voiceConnection.joinConfig.channelId;

        if (botChannelId !== userVoiceState.channel_id) {
          if (subscription.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
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

          unsubscribe(interaction.guild_id);
          subscription.voiceConnection.destroy();
          subscription = undefined;
        }
      }

      if (!subscription) {
        const connection = joinVoiceChannel({
          channelId: userVoiceState.channel_id,
          guildId: interaction.guild_id,
          adapterCreator: client.voiceAdapterCreator(interaction.guild_id),
        });

        subscription = new TTS(connection);
        subscribe(interaction.guild_id, subscription);

        connection.on('stateChange', (_, newState) => {
          if (newState.status === VoiceConnectionStatus.Destroyed) {
            unsubscribe(interaction.guild_id!);
          }
        });
      }

      const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

      const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'M563YhMmA0S8vEYwkgYa', {
        text: `${interaction.member.nick ?? interaction.member.user.global_name ?? interaction.member.user.username}: ${text}`,
        languageCode: !language || language === 'auto' ? interaction.locale.split('-')[0] : language.split('-')[0],
        modelId: 'eleven_flash_v2_5',
        outputFormat: 'opus_48000_192',
      });

      const buffer = Buffer.from(audio.audioBase64, 'base64');

      subscription.enqueue({
        buffer,
        onFinish: () => {
          if (subscription!.queue.length === 0) {
            subscription!.timeout = setTimeout(
              () => {
                if (subscription!.queue.length === 0) {
                  subscription!.voiceConnection.destroy();
                }
                subscription!.timeout = null;
              },
              5 * 60 * 1000,
            );
          }
        },
      });

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} text-to-speech request added to queue`,
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

      const { data, error } = await supabase
        .from('tts')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const now = new Date().getTime();
      const msIn24h = 24 * 60 * 60 * 1000;

      let useAmount = data?.use_amount ?? 0;

      const lastReset = data?.last_used ? new Date(data.last_used).getTime() : null;
      const within24h = lastReset !== null && now - lastReset < msIn24h;

      if (!within24h) {
        useAmount = 0;
      }

      if (useAmount >= 50 && !env.get('dev_ids').toArray().includes(interaction.user?.id ?? interaction.member?.user.id)) {
        const resetTime = (lastReset ?? now) + msIn24h;

        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You have used your daily limit of ${highlight(50, HighlightStyle.Bold)} TTS requests\n-# Try again ${timestamp(Math.floor(resetTime), TimestampStyle.RelativeTime)}`,
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
        languageCode: !language || language === 'auto' ? interaction.locale.split('-')[0] : language.split('-')[0],
        modelId: 'eleven_flash_v2_5',
        outputFormat: 'opus_48000_192',
      });

      const buffer = Buffer.from(audio.audioBase64, 'base64');

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

      await supabase.from('tts').upsert({
        user_id: interaction.user?.id ?? interaction.member?.user.id,
        use_amount: useAmount + 1,
        last_used: new Date(),
      });
    }
  },
} satisfies ChatInputCommand<Options>;
