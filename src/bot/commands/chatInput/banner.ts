import {
  APIComponentInMessageActionRow,
  APIInteractionDataResolvedGuildMember,
  APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';
import { cdn, icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  user?: { user?: APIUser; member?: APIInteractionDataResolvedGuildMember };
  scope?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'banner',
  description: "View a user's banner",
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'The user to view the banner of',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'scope',
      description: 'the scope of the banner to view',
      choices: [
        {
          name: 'Global',
          value: 'global',
        },
        {
          name: 'Guild',
          value: 'guild',
        },
      ],
      required: false,
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    let { user: target, scope } = options;

    if (!target) {
      target = { user: interaction.user ?? interaction.member?.user, member: interaction.member };
    }

    if (!scope) {
      scope = 'global';
    }

    const { user, member } = target;

    if (!user) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid user to view their banner.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const u = await client.api.users.get(user.id);
    let m;

    if (member) {
      m = await client.api.guilds.getMember(interaction.guild_id!, user.id);
    }

    if (scope === 'guild' && m) {
      if (!m.banner) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Exclamation)} This member doesn't has a banner.`,
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
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: cdn(
                        `guilds/${interaction.guild_id}/users/${user.id}/banners/${m.banner}`,
                        4096,
                        'webp',
                        true,
                      ),
                    },
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/banners/${m.banner}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/banners/${m.banner}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/banners/${m.banner}`, 4096, 'webp'),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(m.banner.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${m.avatar}`, 4096, 'gif'),
                          label: 'GIF',
                          style: ButtonStyle.Link,
                        },
                      ] satisfies APIComponentInMessageActionRow[])
                    : []),
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      if (!u.banner) {
        await client.api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Exclamation)} This user doesn't has a banner.`,
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
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'webp', true),
                    },
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'webp', true),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(u.banner?.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(`/banners/${user.id}/${u.banner}`, 4096, 'gif'),
                          label: 'GIF',
                          style: ButtonStyle.Link,
                        },
                      ] satisfies APIComponentInMessageActionRow[])
                    : []),
                ],
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ChatInputCommand<Options>;
