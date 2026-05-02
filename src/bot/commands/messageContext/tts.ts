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
  },
} satisfies MessageContextMenuCommand;
