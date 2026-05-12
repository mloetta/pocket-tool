import {
  APIMessageTopLevelComponent,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  Locale,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, RequestMethod, ResponseType, TimestampStyle } from '../../../types/types.js';
import { icon, link, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { makeRequest } from '../../../utils/request.js';
import env from '../../../utils/env.js';

type Options = {
  url: string;
  language?: string;
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
    {
      type: ApplicationCommandOptionType.String,
      name: 'language',
      description: 'The language of the tweet (auto for discord locale)',
      required: false,
      autocomplete: true,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 10,
  },
  acknowledge: true,
  async autocomplete(interaction, client) {
    const option = interaction.data.options.find((o) => 'focused' in o && o.focused);
    const focused = option && 'value' in option ? option.value.toString().toLowerCase() : '';

    const choices = [
      {
        name: 'Auto',
        value: 'auto',
      },
      ...Object.entries(Locale).map(([key, value]) => ({
        name: key,
        value,
      })),
    ]
      .filter((c) => c.name.toLowerCase().includes(focused))
      .slice(0, 25);

    await client.api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
  },
  async run(interaction, options, client) {
    const { url, language } = options;

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

    let content = res.hasText ? res.displayText : undefined;

    let translated = false;

    if (language && content) {
      const translator = await makeRequest('https://translate.googleapis.com/translate_a/single', {
        method: RequestMethod.GET,
        response: ResponseType.JSON,
        params: {
          client: 'gtx',
          sl: res.language ?? 'auto',
          tl: language === 'auto' ? interaction.locale : language,
          dt: 't',
          q: content,
        },
      });

      content = translator[0][0][0];
      translated = true;
    }

    for (const hashtag of res.hashtags) {
      const escaped = hashtag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`#${escaped}(?![\\p{L}\\p{N}_])`, 'gu');

      content = content?.replace(pattern, link(`https://x.com/hashtag/${hashtag}`, `#${hashtag}`));
    }

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        ...(res.quotedPost
          ? ([
              {
                type: ComponentType.TextDisplay,
                content: `-# *Quoting ${link(`https://x.com/${res.quotedPost?.author.username}/status/${res.quotedPost?.id}`, 'this tweet')}, posted by ${link(`https://x.com/${res.quotedPost?.author.username}`, `@${res.quotedPost?.author.username}`)}*`,
              },
            ] satisfies APIMessageTopLevelComponent[])
          : res.parentPost
            ? ([
                {
                  type: ComponentType.TextDisplay,
                  content: `-# *In reply to ${link(`https://x.com/${res.parentPost?.author.username}/status/${res.parentPost?.id}`, 'this tweet')}, posted by ${link(`https://x.com/${res.parentPost?.author.username}`, `@${res.parentPost?.author.username}`)}*`,
                },
              ] satisfies APIMessageTopLevelComponent[])
            : []),
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `-# Posted by ${res.author.isVerified ? `${icon(Emoji.Verified)} ` : ''}**${res.author.name} (${link(`https://x.com/${res.author.username}`, `@${res.author.username}`)})**${content ? `\n\n${content}` : ''}`,
            },
            ...(res.media.length > 0
              ? ([
                  {
                    type: ComponentType.MediaGallery,
                    items: res.media.slice(0, 10).map((media: any) => ({
                      media: {
                        url: media.url,
                      },
                    })),
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            ...(translated
              ? ([
                  {
                    type: ComponentType.TextDisplay,
                    content: '-# Translated tweets may be inaccurate or may not reflect the original content.',
                  },
                ] satisfies APIMessageTopLevelComponent[])
              : []),
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# ${timestamp(new Date(res.createdAt).getTime(), TimestampStyle.FullDateShortTime)}`,
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${icon(Emoji.Reply)} ${(res.replyCount ?? 0).toLocaleString('en-US')}   ${icon(Emoji.Repost)} ${(res.repostCount ?? 0).toLocaleString('en-US')}   ${icon(Emoji.Like)} ${(res.likeCount ?? 0).toLocaleString('en-US')}   ${icon(Emoji.Bookmark)} ${(res.bookmarkCount ?? 0).toLocaleString('en-US')}`,
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
