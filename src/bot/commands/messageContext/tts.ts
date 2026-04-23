import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { MessageContextMenuCommand, RateLimitType } from '../../../types/types.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../../../utils/env.js';
import prism from 'prism-media';
import { Readable } from 'stream';
import OpusScript from 'opusscript';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

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

    const elevenlabs = new ElevenLabsClient({
      apiKey: env.get('eleven_labs_api_key', true).toString(),
    });

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps('bIHbv24MWmeRgasZH58o', {
      text: content,
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
} satisfies MessageContextMenuCommand;

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
