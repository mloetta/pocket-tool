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
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  text: string;
  gender?: string;
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
      name: 'gender',
      description: 'The gender of the voice to use for TTS',
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
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { text, gender } = options;

    const elevenlabs = new ElevenLabsClient({
      apiKey: env.get('eleven_labs_api_key', true).toString(),
    });

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps(gender ?? 'bIHbv24MWmeRgasZH58o', {
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
