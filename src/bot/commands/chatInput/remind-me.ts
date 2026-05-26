import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { readableTimeToMs } from '../../../utils/utils.js';
import { emoji, timestamp } from '../../../utils/markdown.js';
import { supabase } from '../../../utils/supabase.js';
import { LOOKAHEAD_MS, scheduleReminder } from '../../../crons/reminder.js';

type Options = {
  time: string;
  reason?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'remind-me',
  description: "Remind's you to do something at a specified time",
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'time',
      description: 'When to remind you (e.g. 3m, 5s, 1h)',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'reason',
      description: 'What to remind you about',
      required: false,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { time: rawTime, reason } = options;

    const time = readableTimeToMs(rawTime);

    if (!time) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Invalid time format, please use a valid time format (e.g. 3m, 5s, 1h)`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const date = new Date(new Date().getTime() + time);

    const id = crypto.randomUUID();

    await supabase.from('reminder').insert({
      id,
      user_id: interaction.user?.id ?? interaction.member?.user.id,
      time: date,
      reason,
    });

    if (time <= LOOKAHEAD_MS) {
      scheduleReminder(
        { id, user_id: (interaction.user?.id ?? interaction.member?.user.id)!, time: date, reason },
        client,
      );
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${emoji('correct')} Reminder successfully scheduled for ${timestamp(date.getTime(), TimestampStyle.FullDateShortTime)}`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;
