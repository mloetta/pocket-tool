import { APIComponentInContainer, ComponentType, MessageFlags } from '@discordjs/core';
import { Component, InteractableComponentType } from '../../../types/types.js';
import { icon } from '../../../utils/markdown.js';
import { Emoji } from '../../../types/emojis.js';

export default {
  type: InteractableComponentType.Modal,
  customId: 'bug-form',
  async run(interaction, args, client) {
    const components = interaction.data?.components;

    const bugCategory =
      components?.[0].type === ComponentType.Label
        ? components?.[0].component?.type === ComponentType.StringSelect
          ? components?.[0].component.values[0]
          : undefined
        : undefined;

    const bugDescription =
      components?.[1].type === ComponentType.Label
        ? components?.[1].component?.type === ComponentType.TextInput
          ? components?.[1].component.value
          : undefined
        : undefined;

    const bugBehavior =
      components?.[2].type === ComponentType.Label
        ? components?.[2].component?.type === ComponentType.TextInput
          ? components?.[2].component.value
          : undefined
        : undefined;

    const bugReproduce =
      components?.[3].type === ComponentType.Label
        ? components?.[3].component?.type === ComponentType.TextInput
          ? components?.[3].component.value
          : undefined
        : undefined;

    const attachmentIds =
      components?.[4]?.type === ComponentType.Label
        ? components?.[4].component?.type === ComponentType.FileUpload
          ? components?.[4].component.values
          : undefined
        : undefined;

    const bugAttachments = attachmentIds?.map((id) => interaction.data.resolved?.attachments?.[id]) ?? undefined;

    if (
      bugAttachments &&
      bugAttachments.some(
        (attachment) =>
          !attachment?.content_type?.startsWith('image/') && attachment?.content_type?.startsWith('video/'),
      )
    ) {
      await client.api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} Please provide valid image or video files.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      return;
    }

    const attachmentUrls = bugAttachments?.map((attachment) => attachment?.url) ?? [];

    const bugReportId = crypto.randomUUID();

    let categoryId;

    switch (bugCategory) {
      case 'interaction-failure': {
        categoryId = '1494848698700791961';
        break;
      }
      case 'incorrect-behavior': {
        categoryId = '1494848742417891540';
        break;
      }
      case 'performance-issue': {
        categoryId = '1494848774722556045';
        break;
      }
      case 'other': {
        categoryId = '1494848812970279083';
        break;
      }
    }

    await client.api.channels.createForumThread('1467550986129113169', {
      name: `Bug Report: ${bugReportId}`,
      applied_tags: ['1489983907477721238', '1467551226378981428', categoryId!],
      message: {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `## Description\n${bugDescription || 'No description provided.'}`,
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `## Steps to Reproduce\n${bugReproduce || 'No steps to reproduce provided.'}`,
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `## Expected Behavior\n${bugBehavior || 'No expected behavior provided.'}`,
              },
              ...(attachmentUrls.length > 0
                ? ([
                    {
                      type: ComponentType.Separator,
                    },
                    {
                      type: ComponentType.TextDisplay,
                      content: '## Attachments',
                    },
                    {
                      type: ComponentType.MediaGallery,
                      items: attachmentUrls
                        .filter((url): url is string => url !== undefined)
                        .map((url: string) => ({
                          media: {
                            type: bugAttachments?.find((a) => a?.url === url)?.content_type ?? 'image',
                            url: url,
                          },
                        })),
                    },
                  ] satisfies APIComponentInContainer[])
                : []),
            ],
          },
        ],
      },
    });
  },
} satisfies Component<InteractableComponentType.Modal>;
