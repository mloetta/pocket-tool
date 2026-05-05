import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { supabase } from '../../../utils/supabase.js';

type Options = {
  reason?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'afk',
  description: "Go AFK and let other users know you're away",
  integration_types: [ApplicationIntegrationType.GuildInstall],
  contexts: [InteractionContextType.Guild],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'reason',
      description: 'Reason for going AFK',
      required: false,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { reason } = options;

    const { data, error } = await supabase
      .from('afk')
      .select('*')
      .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data && reason) {
      await supabase
        .from('afk')
        .update({ reason })
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id);
    } else if (!data) {
      await supabase.from('afk').insert({
        user_id: interaction.user?.id ?? interaction.member?.user.id,
        reason: reason ?? null,
        went_away: new Date(),
      });
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${icon(Emoji.Correct)} You're now afk!\n-# Send a message to return.`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
