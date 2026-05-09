import {
  APIMessageTopLevelComponent,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, RequestMethod, ResponseType, TimestampStyle } from '../../../types/types.js';
import { icon, link, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { makeRequest } from '../../../utils/request.js';
import env from '../../../utils/env.js';

type Options = {
  url: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'tweet',
  description: 'Display a tweet',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: 'url',
      description: 'The URL or ID of the tweet',
      required: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 10,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    const { url } = options;

    const tolgchuTwitterApiKey = env.get('tolgchu_twitter_api_key').toString();

    if (!tolgchuTwitterApiKey) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Twitter API key not set.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const tweetId = extractTweetId(url);

    if (!tweetId) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please provide a valid tweet URL or ID to view.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const res = await makeRequest('https://x.tolgchu.dev/post', {
      method: RequestMethod.GET,
      response: ResponseType.JSON,
      headers: {
        Authorization: `Bearer ${tolgchuTwitterApiKey}`,
      },
      params: {
        id: tweetId,
      },
    });

    if (!res) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Failed to find the tweet.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# Posted by ${res.author.name} (${link(`https://x.com/${res.author.username}`, res.author.username)})${res.hasText ? `\n\n${res.displayText}` : ''}${res.hashtags.length > 0 ? `\n#${res.hashtags.join(' #')}` : ''}`,
            },
            ...(res.media.lenght > 0
              ? ([
                  {
                    type: ComponentType.MediaGallery,
                    items: res.media.map((media: any) => ({
                      media: {
                        url: media.url,
                      },
                    })),
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${timestamp(new Date(res.createdAt).getTime(), TimestampStyle.FullDateShortTime)}`,
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${(res.replyCount ?? 0).toLocaleString('en-US')} ${(res.repostCount ?? 0).toLocaleString('en-US')} ${(res.likeCount ?? 0).toLocaleString('en-US')} ${(res.bookmarkCount ?? 0).toLocaleString('en-US')}`,
                },
              ],
              accessory: {
                type: ComponentType.Button,
                url: `https://x.com/${res.author.username}/status/${tweetId}`,
                label: 'View Tweet',
                style: ButtonStyle.Link,
              },
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand<Options>;

const regex = /^(?:https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/(?:#!\/)?\w+\/status\/(\d+)|(\d+))$/;

function extractTweetId(input: string) {
  const match = input.match(regex);

  if (!match) return null;

  return match[1] || match[2];
}
