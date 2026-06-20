import { ApplicationCommandType, ApplicationIntegrationType, ComponentType, InteractionContextType, MessageFlags } from '@discordjs/core';
import { HighlightStyle, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../../../utils/env.js';
import { supabase } from '../../../utils/supabase.js';
import { emoji, highlight, timestamp, truncate } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';
import { hasPermission } from '../../../utils/utils.js';
import { Permissions } from '../../../types/permissions.js';

createApplicationCommand({
  type: ApplicationCommandType.Message,
  name: 'Text to Speech',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 10,
  },
  acknowledge: true,
  async run(interaction, api) {
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

    const messageId = interaction.data.target_id;
    const message = interaction.data.resolved.messages[messageId];

    if (!message) return;

    const content = message.content;

    if (!content) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid message to convert to speech`,
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

    const audio = await elevenlabs.textToSpeech.convertWithTimestamps('M563YhMmA0S8vEYwkgYa', {
      text: truncate(content, 500),
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
  },
});
