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
import OpusScript from 'opusscript';
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
          value: 'bIHbv24MWmeRgasZH58o',
        },
        {
          name: 'Female',
          value: 'cgSgspJ2msm6clMCkdW9',
        },
        {
          name: 'Mommy',
          value: '7qHr4KHwfXpD3fsHYcoz',
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

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(voice ?? 'bIHbv24MWmeRgasZH58o', {
      text,
      modelId: 'eleven_v3',
      outputFormat: 'opus_48000_32',
    });

    const opusBuffer = Buffer.from(audio.audioBase64, 'base64');

    const decoder = new OpusScript(48000, 1);

    const header = opusBuffer.subarray(0, 4).toString();
    const input = Readable.from(opusBuffer);

    const demuxer = header === 'OggS' ? new prism.opus.OggDemuxer() : new prism.opus.WebmDemuxer();

    let pcmBuffer: number[] = [];
    const waveform: number[] = [];

    input
      .pipe(demuxer)
      .on('data', (chunk) => {
        try {
          const pcm = decoder.decode(chunk);

          for (let i = 0; i < pcm.length; i++) {
            pcmBuffer.push(pcm[i]);
          }

          while (pcmBuffer.length >= 960) {
            let sum = 0;

            for (let i = 0; i < 960; i++) {
              const sample = Math.max(-1, Math.min(1, pcmBuffer[i] / 32768));
              sum += sample * sample;
            }

            const rms = Math.sqrt(sum / 960);
            waveform.push(rms);

            pcmBuffer = pcmBuffer.slice(960);
          }
        } catch {}
      })
      .on('end', async () => {
        const max = Math.max(...waveform, 1e-6);
        const normalized = waveform.map((v) => v / max);

        const reduced = downsample(normalized, 256);
        const base64Waveform = toBase64Waveform(reduced);

        const duration = audio.alignment?.characterEndTimesSeconds?.at(-1) ?? 0;

        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          attachments: [
            {
              id: 0,
              filename: 'audio.opus',
              waveform: base64Waveform,
              duration_secs: duration,
            },
          ],
          files: [
            {
              name: 'audio.opus',
              data: opusBuffer,
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

          const stream = Readable.from(opusBuffer);

          const demuxer =
            opusBuffer.subarray(0, 4).toString() === 'OggS'
              ? new prism.opus.OggDemuxer()
              : new prism.opus.WebmDemuxer();

          const resource = createAudioResource(stream.pipe(demuxer), {
            inputType: StreamType.Opus,
          });

          player.play(resource);

          player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
          });
        }
      })
      .on('error', async () => {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Wrong)} An error occurred while processing the audio.`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      });
  },
} satisfies ChatInputCommand<Options>;

function downsample(data: number[], target = 256) {
  if (data.length <= target) return data;

  const bucketSize = Math.ceil(data.length / target);
  const result: number[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    let max = 0;

    for (let j = 0; j < bucketSize; j++) {
      const v = Math.abs(data[i + j] || 0);
      if (v > max) max = v;
    }

    result.push(max);
  }

  return result.slice(0, target);
}

function toBase64Waveform(data: number[]) {
  const uint8 = Uint8Array.from(data.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255)));

  return Buffer.from(uint8).toString('base64');
}
