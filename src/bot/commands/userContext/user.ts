import { ApplicationCommandType, ComponentType, MessageFlags, UserFlags } from '@discordjs/core';
import { RateLimitType, TimestampStyle, UserContextMenuCommand } from '../../../types/types.js';
import { icon, pill, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: ApplicationCommandType.User,
  name: 'View User',
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, client) {
    const userId = interaction.data.target_id;
    const user = interaction.data.resolved.users[userId];
    const member = interaction.data.resolved.members?.[userId];

    if (!user) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please select a valid user to view.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    let badges: Emoji[] = [];

    if (user.public_flags) {
      const flags = user.public_flags;
      if (flags & UserFlags.Staff) {
        badges.push(Emoji.Staff);
      }
      if (flags & UserFlags.BugHunterLevel1) {
        badges.push(Emoji.BugHunter01);
      }
      if (flags & UserFlags.BugHunterLevel2) {
        badges.push(Emoji.BugHunter02);
      }
      if (flags & UserFlags.PremiumEarlySupporter) {
        badges.push(Emoji.EarlySupporter);
      }
      if (flags & UserFlags.VerifiedDeveloper) {
        badges.push(Emoji.VerifiedDeveloper);
      }
      if (flags & UserFlags.Hypesquad) {
        badges.push(Emoji.HypesquadEvents);
      }
      if (flags & UserFlags.HypeSquadOnlineHouse2) {
        badges.push(Emoji.HypesquadBrilliance);
      }
      if (flags & UserFlags.HypeSquadOnlineHouse1) {
        badges.push(Emoji.HypesquadBravery);
      }
      if (flags & UserFlags.HypeSquadOnlineHouse3) {
        badges.push(Emoji.HypesquadBalance);
      }
      if (flags & UserFlags.CertifiedModerator) {
        badges.push(Emoji.CertifiedModerator);
      }
    }

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
                  content: `${icon(Emoji.Mention)} ${member?.nick ?? user.username} (${pill(user.id)})\n${badges.length > 0 ? badges.map(icon).join(' ') : ''}`,
                },
              ],
              accessory: {
                type: ComponentType.Thumbnail,
                media: {
                  url: member?.avatar
                    ? `https://cdn.discordapp.com/guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}.${member.avatar.startsWith('a_') ? 'gif' : 'png'}`
                    : user.avatar
                      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`
                      : `https://cdn.discordapp.com/embed/avatars/${Number(user.id) % 5}.png`,
                },
              },
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `${icon(Emoji.Wumpus)} **Created:**\n${timestamp(Number(BigInt(user.id) >> 22n) + 1420070400000, TimestampStyle.LongDate)}${member ? `\n${icon(Emoji.Leaf)} **Joined:**\n${timestamp(new Date(member.joined_at!).getTime(), TimestampStyle.LongDate)}` : ''}`,
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies UserContextMenuCommand;
