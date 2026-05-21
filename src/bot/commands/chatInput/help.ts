import {
  ApplicationCommandType,
  ApplicationIntegrationType,
  ButtonStyle,
  ComponentType,
  InteractionContextType,
  MessageFlags,
  SeparatorSpacingSize,
} from '@discordjs/core';
import { ChatInputCommand, HighlightStyle, RateLimitType } from '../../../types/types.js';
import { emoji, highlight, maskedLink } from '../../../utils/markdown.js';
import { toEmoji } from '../../../utils/utils.js';

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'help',
  description: 'Learn more about me and what I can do',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 3,
  },
  acknowledge: true,
  async run(interaction, options, client) {
    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      components: [
        {
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: '# Welcome to Pocket Tool!',
            },
            {
              type: ComponentType.TextDisplay,
              content: `You can view all the available slash commands by typing ${highlight('/', HighlightStyle.Bold)}\n-# Additionally, you can view context menu commands by right-clicking or long-pressing a message or user`,
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: '## How to report bugs?',
            },
            {
              type: ComponentType.Section,
              components: [
                {
                  type: ComponentType.TextDisplay,
                  content: 'To report bugs simply click the button on the right and fill out the form',
                },
              ],
              accessory: {
                type: ComponentType.Button,
                custom_id: 'report-bugs',
                label: 'Report Bugs',
                emoji: toEmoji('BugHunter'),
                style: ButtonStyle.Secondary,
              },
            },
            {
              type: ComponentType.Separator,
            },
            {
              type: ComponentType.TextDisplay,
              content: `-# ${emoji('Exclamation')} You can visit **${maskedLink('https://discord.com/blog/slash-commands-permissions-discord-apps-bots', 'Discord Integration Settings')}** to learn how to disable commands`,
            },
            {
              type: ComponentType.Separator,
              spacing: SeparatorSpacingSize.Small,
              divider: false,
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: 'Invite Me!',
<<<<<<< HEAD
                  emoji: toEmoji('Link'),
=======
                  emoji: iconAsEmoji(Emoji.Link),
>>>>>>> d4c245d82b12d7c007e641cf296ffb34c48c3ac1
                  url: `https://discord.com/oauth2/authorize?client_id=${interaction.application_id}`,
                  style: ButtonStyle.Link,
                },
                {
                  type: ComponentType.Button,
                  label: 'Support Server',
<<<<<<< HEAD
                  emoji: toEmoji('Discord'),
=======
                  emoji: iconAsEmoji(Emoji.Discord),
>>>>>>> d4c245d82b12d7c007e641cf296ffb34c48c3ac1
                  url: 'https://discord.gg/EEAchFSWpr',
                  style: ButtonStyle.Link,
                },
              ],
            },
          ],
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
} satisfies ChatInputCommand;
