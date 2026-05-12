import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  TextInputStyle,
} from '@discordjs/core';
import { ChatInputCommand, RateLimitType } from '../../../types/types.js';

type Options = {
  create: {
    name: string;
  };
  manage: {
    name: string;
  };
  send: {
    name: string;
  };
};

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'tag',
  description: 'Create, manage or send tags',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  options: [
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'create',
      description: 'Create a new tag',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag to create',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'manage',
      description: 'Manage tags',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag to manage',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'send',
      description: 'Send a tag',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag to send',
          required: true,
        },
      ],
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  dev: true,
  async run(interaction, options, client) {
    const { create, manage, send } = options;

    if (create) {
      const { name } = create;

      await client.api.interactions.createModal(interaction.id, interaction.token, {
        custom_id: `tag-create_${name}`,
        title: 'Tag',
        components: [
          {
            type: ComponentType.Label,
            label: 'Content',
            description: 'The content of the tag to create',
            component: {
              type: ComponentType.TextInput,
              custom_id: 'tag-content',
              style: TextInputStyle.Paragraph,
              required: true,
            },
          },
          {
            type: ComponentType.Label,
            label: 'Attachments',
            description: 'The attachments to include with the tag',
            component: {
              type: ComponentType.FileUpload,
              custom_id: 'tag-attachments',
              min_values: 0,
              max_values: 4,
              required: false,
            },
          },
          {
            type: ComponentType.Label,
            label: 'Actions',
            description: 'The action to perform when sending the tag',
            component: {
              type: ComponentType.RadioGroup,
              custom_id: 'tag-action',
              options: [
                {
                  label: 'CV2',
                  value: 'cv2',
                  description: 'Wether or not you want your tag to be inside a container',
                },
                {
                  label: 'Embed',
                  value: 'embed',
                  description: 'Wether or not you want your tag to be embedded in a message',
                },
              ],
              required: false,
            },
          },
        ],
      });
    }
  },
} satisfies ChatInputCommand<Options>;
