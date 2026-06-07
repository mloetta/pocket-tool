import { ComponentType, TextInputStyle } from '@discordjs/core';
import { InteractableComponentType } from '../../../types/types.js';
import createComponent from '../../../helpers/component.js';

createComponent({
  type: InteractableComponentType.Button,
  custom_id: 'report-bugs',
  async run(interaction, args, api) {
    await api.interactions.createModal(interaction.id, interaction.token, {
      custom_id: 'bug-report',
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
          label: 'Priority',
          description: 'How critical is this bug?',
          component: {
            type: ComponentType.RadioGroup,
            custom_id: 'bug-priority',
            options: [
              {
                label: 'Low',
                value: 'low',
                description: 'Minor issue that does not significantly impact functionality',
              },
              {
                label: 'Medium',
                value: 'medium',
                description: 'Issue that affects functionality but has a workaround',
              },
              {
                label: 'High',
                value: 'high',
                description: 'Critical issue that severely impacts functionality and has no workaround',
              },
            ],
            required: true,
          },
        },
        {
          type: ComponentType.Label,
          label: 'Current Behavior',
          description: 'What is currently happening that you believe is a bug?',
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
            placeholder: 'Enter what you expected to happen...',
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
});
