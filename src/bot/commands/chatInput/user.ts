import {
  APIInteractionDataResolvedGuildMember,
  APIMessageComponentEmoji,
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
            content: `${emoji('exclamation')} Please select a valid user to view`,
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
      console.log(flags);
      if (flags & UserFlags.Staff) {
        badges.push('staff');
      }
      if (flags & UserFlags.BugHunterLevel1) {
        badges.push('bug_hunter_01');
      }
      if (flags & UserFlags.BugHunterLevel2) {
        badges.push('bug_hunter_02');
      }
      if (flags & UserFlags.PremiumEarlySupporter) {
        badges.push('early_supporter');
      }
      if (flags & UserFlags.VerifiedDeveloper) {
        badges.push('verified_developer');
      }
      if (flags & UserFlags.Hypesquad) {
        badges.push('hypesquad_events');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse2) {
        badges.push('hypesquad_brilliance');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse1) {
        badges.push('hypesquad_bravery');
      }
      if (flags & UserFlags.HypeSquadOnlineHouse3) {
        badges.push('hypesquad_balance');
      }
      if (flags & UserFlags.CertifiedModerator) {
        badges.push('certified_moderator');
      }
    }

    const hasNitro =
      !!user.banner ||
      user.avatar?.startsWith('a_') ||
      !!(user as any).display_name_styles ||
      (member && (member.avatar?.startsWith('a_') || member.banner));

    if (hasNitro) {
      badges.push('nitro');
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
                    content: `${emoji('ping')} **${member.nick ?? user.global_name} (@${user.username})**\n-# ${user.id}${badges.length > 0 ? `\n${badges.map(emoji).join(' ')}` : ''}`,
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
                    emoji: toEmojiObject('person') as APIMessageComponentEmoji,
                    style: ButtonStyle.Link,
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('wumpus')} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}\n\n${emoji('new_members')} **Joined At:**\n${timestamp(new Date(member.joined_at!).getTime(), TimestampStyle.LongDate)}${
                  member.roles.length > 0
                    ? `\n\n${emoji('roles')} **Roles:**\n${member.roles
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
                    content: `${emoji('ping')} **${user.global_name} (@${user.username})**\n-# ${user.id}${badges.length > 0 ? `\n${badges.map(emoji).join(' ')}` : ''}`,
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
                    emoji: toEmojiObject('person') as APIMessageComponentEmoji,
                    style: ButtonStyle.Link,
                  },
                ],
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${emoji('wumpus')} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ChatInputCommand<Options>;
