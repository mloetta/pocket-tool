import {
  APIGuildMember,
  APIInteractionDataResolvedGuildMember,
  APIUser,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  UserFlags,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType, TimestampStyle } from '../../../types/types.js';
import { icon, pill, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

type Options = {
  target?: { user?: APIUser; member?: APIInteractionDataResolvedGuildMember };
  scope?: string;
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'user',
  description: 'views information about a user or yourself',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.User,
      name: 'target',
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
    let { target, scope } = options;
    if (!target) {
      target = { user: interaction.user ?? interaction.member?.user, member: interaction.member };
    }

    if (!scope) {
      scope = 'global';
    }

    if (!target.user) {
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

    if (target.user.public_flags) {
      const flags = target.user.public_flags;
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

    if (scope === 'global') {
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
                    content: `${icon(Emoji.Mention)} ${target.user.username} (${pill(target.user.id)})\n${badges.length > 0 ? badges.map(icon).join(' ') : ''}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: target.user.avatar
                      ? `https://cdn.discordapp.com/avatars/${target.user.id}/${target.user.avatar}.${target.user.avatar?.startsWith('a_') ? 'gif' : 'png'}`
                      : `https://cdn.discordapp.com/embed/avatars/${Number(target.user.id) % 5}.png`,
                  },
                },
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${icon(Emoji.Wumpus)} **Created:**\n${timestamp(Number(BigInt(target.user.id) >> 22n) + 1420070400000, TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (scope === 'guild' && target.member) {
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
                    content: `${icon(Emoji.Mention)} ${target.member.nick ?? target.user.username} (${pill(target.user.id)})\n${badges.length > 0 ? badges.map(icon).join(' ') : ''}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url: target.member?.avatar
                      ? `https://cdn.discordapp.com/guilds/${interaction.guild_id}/users/${target.user.id}/avatars/${target.member.avatar}.${target.member.avatar.startsWith('a_') ? 'gif' : 'png'}`
                      : target.user.avatar
                        ? `https://cdn.discordapp.com/avatars/${target.user.id}/${target.user.avatar}.${target.user.avatar.startsWith('a_') ? 'gif' : 'png'}`
                        : `https://cdn.discordapp.com/embed/avatars/${Number(target.user.id) % 5}.png`,
                  },
                },
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${icon(Emoji.Wumpus)} **Created:**\n${timestamp(Number(BigInt(target.user.id) >> 22n) + 1420070400000, TimestampStyle.LongDate)}\n${icon(Emoji.Leaf)} **Joined:**\n${timestamp(new Date(target.member.joined_at!).getTime(), TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ChatInputCommand<Options>;
