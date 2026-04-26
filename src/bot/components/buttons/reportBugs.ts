import { ComponentType, TextInputStyle } from '@discordjs/core';
import { Component, InteractableComponentType } from '../../../types/types.js';

export default {
  type: InteractableComponentType.Button,
  custom_id: 'report-bugs',
  async run(interaction, args, client) {
    await client.api.interactions.createModal(interaction.id, interaction.token, {
      custom_id: 'bug-form',
      title: 'Bug Report',
      components: [
        {
          type: ComponentType.Label,
          label: 'Category',
          description: 'Select the most appropriate category for the bug',
          component: {
            type: ComponentType.StringSelect,
            custom_id: 'bug-category',
            placeholder: 'Select a category',
            options: [
              {
                label: 'Interaction Failure',
                value: 'interaction-failure',
                description: 'Command or interaction does not respond or fails',
              },
              {
                label: 'Incorrect Behavior',
                value: 'incorrect-behavior',
                description: 'Bot responds with wrong or unexpected output',
              },
              {
                label: 'Performance Issue',
                value: 'performance-issue',
                description: 'Bot is slow or times out often',
              },
              {
                label: 'Other',
                value: 'other',
                description: 'Issue does not fit the categories above',
              },
            ],
            max_values: 1,
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Description',
          description: 'Describe the bug you encountered',
          component: {
            type: ComponentType.TextInput,
            custom_id: 'bug-description',
            placeholder: 'Enter a detailed and clear description of the bug...',
            style: TextInputStyle.Paragraph,
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Expected Behavior',
          description: 'What did you expect to happen?',
          component: {
            type: ComponentType.TextInput,
            custom_id: 'expected-behavior',
            placeholder: 'Enter the expected behavior...',
            style: TextInputStyle.Paragraph,
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Steps to Reproduce',
          description: 'How can we reproduce the bug? Make sure to follow the format below',
          component: {
            type: ComponentType.TextInput,
            custom_id: 'steps-to-reproduce',
            placeholder: '1.\n2.\n3.\n4.\n...',
            style: TextInputStyle.Paragraph,
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Attachments',
          description: 'Please attach any screenshots or videos that may help us identify the bug',
          component: {
            type: ComponentType.FileUpload,
            custom_id: 'bug-attachments',
            max_values: 4,
            required: false,
          },
        },
      ],
    });
  },
} satisfies Component<InteractableComponentType.Button>;
