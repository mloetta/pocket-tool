import {
  APIInteractionDataResolvedGuildMember,
  APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  UserFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { getTimestampFromSnowflake, toEmojiObject } from '../../../utils/utils.js';
import { cdn, emoji, highlight, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  user?: { user?: APIUser; member?: APIInteractionDataResolvedGuildMember };
  scope?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'user',
  description: 'Views information about an user or yourself',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'user',
      description: 'the user to view information about',
      required: false,
    },
    {
      type: ApplicationCommandOptionType.String,
      name: 'scope',
      description: 'the scope of the information to view',
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
            content: `${emoji('Exclamation')} Please select a valid user to view`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const badges: (keyof typeof Emoji)[] = [];

    if (user.public_flags) {
      const flags = user.public_flags;
      if (flags & UserFlags.Staff) {
        badges.push('Staff');
      }
      if (flags & UserFlags.BugHunterLevel1) {
        badges.push('BugHunter01');
      }
      if (flags & UserFlags.BugHunterLevel2) {
        badges.push('BugHunter02');
      }
      if (flags & UserFlags.PremiumEarlySupporter) {
        badges.push('EarlySupporter');
      }
      if (flags & UserFlags.VerifiedDeveloper) {
        badges.push('VerifiedDeveloper');
      }
      if (flags & UserFlags.Hypesquad) {
        badges.push('HypesquadEvents');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse2) {
        badges.push('HypesquadBrilliance');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse1) {
        badges.push('HypesquadBravery');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse3) {
        badges.push('HypesquadBalance');
      }
      if (flags & UserFlags.CertifiedModerator) {
        badges.push('CertifiedModerator');
      }
    }

    const hasNitro =
      !!user.banner ||
      user.avatar?.startsWith('a_') ||
      !!(user as any).display_name_styles ||
      (member && (member.avatar?.startsWith('a_') || member.banner));

    if (hasNitro) {
      badges.push('Nitro');
    }

    if (scope === 'guild' && member) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.Section,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Mention')} **${member.nick ?? user.global_name} (@${user.username})**\n-# ${user.id}${badges.length > 0 ? `\n${badges.map(emoji).join(' ')}` : ''}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: member.avatar
                      ? cdn(
                          `guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                          4096,
                          'webp',
                          true,
                        )
                      : cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                  },
                },
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    url: `discord://-/users/${user.id}`,
                    label: 'View User',
                    emoji: toEmojiObject('User'),
                    style: ButtonStyle.Link,
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wumpus')} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}\n\n${emoji('Leaf')} **Joined At:**\n${timestamp(new Date(member.joined_at!).getTime(), TimestampStyle.LongDate)}${
                  member.roles.length > 0
                    ? `\n\n${emoji('Roles')} **Roles:**\n${member.roles
                        .slice(0, 5)
                        .map((role) => `<@&${role}>`)
                        .join(', ')}`
                    : ''
                }${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`)}` : ``}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.Section,
                components: [
                  {
                    type: ComponentType.TextDisplay,
                    content: `${emoji('Mention')} **${user.global_name} (@${user.username})**\n-# ${user.id}${badges.length > 0 ? `\n${badges.map(emoji).join(' ')}` : ''}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                  },
                },
              },
              {
                type: ComponentType.ActionRow,
                components: [
                  {
                    type: ComponentType.Button,
                    url: `discord://-/users/${user.id}`,
                    label: 'View User',
                    emoji: toEmojiObject('User'),
                    style: ButtonStyle.Link,
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('Wumpus')} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ChatInputCommand<Options>;
