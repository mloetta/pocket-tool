import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { HighlightStyle, RateLimitType, RequestMethod, ResponseType } from '../../../types/types.js';
import { makeRequest } from '../../../utils/request.js';
import { emoji, highlight, truncate } from '../../../utils/markdown.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'lyrics',
  description: 'Search for song lyrics',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'artist',
      description: 'The author of the song',
      required: true,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'song',
      description: 'The song to search lyrics for',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async run(interaction, options, api) {
    const { artist, song } = options;

    const res = await makeRequest(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`,
      {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
      },
    );

    if (res.error || !res.lyrics) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} No lyrics found for ${highlight(song, HighlightStyle.Compact)} by ${highlight(artist, HighlightStyle.Compact)} - maybe try with different terms?`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `-# ${emoji('music')} ${artist} - ${song}\n\n${truncate(res.lyrics, 3900)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
});
