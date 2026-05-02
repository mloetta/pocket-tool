import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import env from '../../../utils/env.js';
import prism from 'prism-media';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { Readable } from 'stream';
import { icon, pill } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { createAdapter, hasPermission } from '../../../utils/utils.js';
import { Permissions } from '../../../types/permissions.js';

type Options = {
  text: string;
  voice?: string;
  play?: boolean;
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
        {
          name: 'h',
          value: 'S0o3L7a2j0fXPOSqqHkq',
        },
        {
          name: 'Mommy',
          value: '5BX0dyTd6iq3fuD6Kuf1',
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Boolean,
      name: 'play',
      description: 'Whether to join the voice channel and play the audio immediately',
      required: false,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { text, voice, play } = options;

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

    const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'M563YhMmA0S8vEYwkgYa', {
      text,
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

    if (play === true) {
      if (!interaction.guild_id) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Exclamation)} You must use this command in a valid guild.`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const member = await client.api.guilds.getMember(
        interaction.guild_id,
        (interaction.user?.id ?? interaction.member?.user.id)!,
      );

      const voiceState = await client.api.voice.getUserVoiceState(interaction.guild_id, member.user.id);

      if (!voiceState?.channel_id) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Exclamation)} You must be in a voice channel to use this command.`,
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
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Wrong)} I don't have enough permissions to play TTS. I need the following permissions in this channel: ${pill('Connect')} and ${pill('Speak')}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const connection = joinVoiceChannel({
        channelId: voiceState.channel_id,
        guildId: interaction.guild_id,
        adapterCreator: createAdapter(interaction.guild_id, client.gateway, await client.gateway.getShardCount()),
      });

      try {
        await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      } catch {
        connection.destroy();
        return;
      }

      const player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Play,
        },
      });

      connection.subscribe(player);

      const stream = Readable.from(buffer);

      const demuxer =
        buffer.subarray(0, 4).toString() === 'OggS' ? new prism.opus.OggDemuxer() : new prism.opus.WebmDemuxer();

      const resource = createAudioResource(stream.pipe(demuxer), {
        inputType: StreamType.Opus,
      });

      player.play(resource);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });
    }
  },
} satisfies ChatInputCommand<Options>;
