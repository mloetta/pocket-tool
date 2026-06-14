import { APIComponentInContainer, ComponentType, MessageFlags } from '@discordjs/core';
import { InteractableComponentType, TimestampStyle } from '../../../types/types.js';
import { emoji, timestamp } from '../../../utils/markdown.js';
import createComponent from '../../../helpers/component.js';

createComponent({
  type: InteractableComponentType.Modal,
  custom_id: 'bug-report',
  async run(interaction, args, api) {
    const components = interaction.data?.components;

    const category =
      components?.[0].type === ComponentType.Label
        ? components?.[0].component?.type === ComponentType.StringSelect
          ? components?.[0].component.values[0]
          : undefined
        : undefined;

    const priority =
      components?.[1].type === ComponentType.Label
        ? components?.[1].component?.type === ComponentType.RadioGroup
          ? components?.[1].component.value
          : undefined
        : undefined;

    const currentBehavior =
      components?.[2].type === ComponentType.Label
        ? components?.[2].component?.type === ComponentType.TextInput
          ? components?.[2].component.value
          : undefined
        : undefined;

    const expectedBehavior =
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

    const attachments = attachmentIds?.map((id) => interaction.data.resolved?.attachments?.[id]) ?? undefined;

    if (
      attachments &&
      attachments.some(
        (attachment) =>
          !attachment?.content_type?.startsWith('image/') && attachment?.content_type?.startsWith('video/'),
      )
    ) {
      await api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please provide valid image or video files`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      return;
    }

    const attachmentUrls = attachments?.map((a) => a?.url) ?? [];

    const bugReportId = crypto.randomUUID();

    let categoryId;

    switch (category) {
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

    let priorityId;

    switch (priority) {
      case 'low': {
        priorityId = '1467551077837832325';
        break;
      }
      case 'medium': {
        priorityId = '1467551096477323296';
        break;
      }
      case 'high': {
        priorityId = '1467551113568977102';
        break;
      }
    }

    const now = new Date();

    await api.channels.createForumThread('1467550986129113169', {
      name: `Bug Report: ${bugReportId}`,
      applied_tags: ['1489983907477721238', '1467551226378981428', categoryId!],
      message: {
        components: [
          {
            type: ComponentType.Container,
            components: [
              {
                type: ComponentType.TextDisplay,
                content: `### Current Behavior\n${currentBehavior || 'No current behavior provided.'}`,
              },
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `### Expected Behavior\n${expectedBehavior || 'No expected behavior provided.'}`,
              },
              ...(attachmentUrls.length > 0
                ? ([
                    {
                      type: ComponentType.Separator,
                    },
                    {
                      type: ComponentType.TextDisplay,
                      content: '### Attachments',
                    },
                    {
                      type: ComponentType.MediaGallery,
                      items: attachmentUrls
                        .filter((u): u is string => u !== undefined)
                        .map((u: string) => ({
                          media: {
                            type: attachments?.find((a) => a?.url === u)?.content_type ?? 'image',
                            url: u,
                          },
                        })),
                    },
                  ] satisfies APIComponentInContainer[])
                : []),
              {
                type: ComponentType.Separator,
              },
              {
                type: ComponentType.TextDisplay,
                content: `-# Bug Report by: <@${interaction.user?.id ?? interaction.member?.user.id}> at ${timestamp(now.getTime(), TimestampStyle.FullDateShortTime)} (${timestamp(now.getTime(), TimestampStyle.RelativeTime)})`,
              },
            ],
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      },
    });

    await api.interactions.reply(interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${emoji('correct')} Successfully submitted bug report`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  },
});
