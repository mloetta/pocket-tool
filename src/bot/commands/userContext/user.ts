import {
  APIMessageComponentEmoji,
  ApplicationCommandType,
  ButtonStyle,
  ComponentType,
  MessageFlags,
  UserFlags,
} from '@discordjs/core';
import { RateLimitType, TimestampStyle, UserContextMenuCommand } from '../../../types/types.js';
import { getTimestampFromSnowflake, toEmojiObject } from '../../../utils/utils.js';
import { cdn, emoji, highlight, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: ApplicationCommandType.User,
  name: 'View User',
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run({ data: interaction, api, shardId }, client) {
    const userId = interaction.data.target_id;
    const user = interaction.data.resolved.users[userId];
    const member = interaction.data.resolved.members?.[userId];

    if (!user) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
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

    await api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: `${emoji('ping')} **${member?.nick ?? user.global_name} (@${user.username})**\n-# ${user.id}${badges.length > 0 ? `\n${badges.map(emoji).join(' ')}` : ''}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: member?.avatar
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
              content: `${emoji('calendar')} **Created:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}${
                member
                  ? `\n\n${emoji('new_members')} **Joined:**\n${timestamp(new Date(member.joined_at!).getTime(), TimestampStyle.LongDate)}${
                      member.roles.length > 0
                        ? `\n\n${emoji('roles')} **Roles:**\n${member.roles
                            .slice(0, 5)
                            .map((role) => `<@&${role}>`)
                            .join(', ')}`
                        : ''
                    }${member.roles.length > 5 ? ` ${highlight(`+${(member.roles.length - 5).toLocaleString('en-US')}`)}` : ``}`
                  : ''
              }`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies UserContextMenuCommand;
