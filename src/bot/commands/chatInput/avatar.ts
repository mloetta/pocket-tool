import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  type APIComponentInMessageActionRow,
  type APIInteractionDataResolvedGuildMember,
} from '@discordjs/core';
import { RateLimitType } from '../../../types/types.js';
import { cdn, emoji } from '../../../utils/markdown.js';
import createApplicationCommand from '../../../helpers/command.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'avatar',
  description: "View a user's avatar",
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'The user to view the avatar of',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'scope',
      description: 'the scope of the avatar to view',
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
  async run(interaction, options, api) {
    let { user: target, scope } = options;

    if (!target) {
      target = {
        user: (interaction.user ?? interaction.member?.user)!,
        member: interaction.member as APIInteractionDataResolvedGuildMember,
      };
    }

    if (!scope) {
      scope = 'global';
    }

    const { user, member } = target;

    if (!user) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid user to view their avatar`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (scope === 'guild' && member) {
      if (!member.avatar) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} <@${user.id}> doesn't has a guild avatar`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'webp', true),
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
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'webp'),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(member.avatar.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(`guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`, 4096, 'gif'),
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
      if (!user.avatar) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} <@${user.id}> doesn't has an avatar`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.MediaGallery,
                items: [
                  {
                    media: {
                      url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
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
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'png'),
                    label: 'PNG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'jpg'),
                    label: 'JPG',
                    style: ButtonStyle.Link,
                  },
                  {
                    type: ComponentType.Button,
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                    label: 'WEBP',
                    style: ButtonStyle.Link,
                  },
                  ...(user.avatar?.startsWith('a_')
                    ? ([
                        {
                          type: ComponentType.Button,
                          url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'gif'),
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
});
