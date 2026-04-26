import {
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
import { cdn, icon, pill, timestamp } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';
import { getTimestampFromSnowflake } from '../../../utils/utils.js';

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

    const { user, member } = target;

    if (!scope) {
      scope = 'global';
    }

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

    const hasNitro =
      !!user.banner ||
      user.avatar?.startsWith('a_') ||
      !!(user as any).display_name_styles ||
      (member && (member.avatar?.startsWith('a_') || member.banner));

    if (hasNitro) {
      badges.push(Emoji.Nitro);
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
                    content: `${icon(Emoji.Mention)} ${user.username} ${pill(user.id)}\n${badges.length > 0 ? badges.map(icon).join(' ') : ''}`,
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
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${icon(Emoji.Wumpus)} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (scope === 'guild' && member) {
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
                    content: `${icon(Emoji.Mention)} ${member.nick ?? user.username} ${pill(user.id)}\n${badges.length > 0 ? badges.map(icon).join(' ') : ''}`,
                  },
                ],
                accessory: {
                  type: ComponentType.Thumbnail,
                  media: {
                    url:
                      cdn(
                        `guilds/${interaction.guild_id}/users/${user.id}/avatars/${member.avatar}`,
                        4096,
                        'webp',
                        true,
                      ) ?? cdn(`/avatars/${user.id}/${user.avatar}`, 4096, 'webp', true),
                  },
                },
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `${icon(Emoji.Wumpus)} **Created At:**\n${timestamp(getTimestampFromSnowflake(user.id), TimestampStyle.LongDate)}\n${icon(Emoji.Leaf)} **Joined At:**\n${timestamp(new Date(member.joined_at!).getTime(), TimestampStyle.LongDate)}`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
} satisfies ChatInputCommand<Options>;
