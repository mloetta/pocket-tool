import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  ComponentType,
  InteractionContextType,
  MessageFlags,
} from '@discordjs/core';
import createApplicationCommand from '../../../helpers/command.js';
import { HighlightStyle, RateLimitType } from '../../../types/types.js';
import { supabase } from '../../../utils/supabase.js';
import { emoji, highlight } from '../../../utils/markdown.js';
import { getChatInputFocusedOption } from '../../index.js';

createApplicationCommand({
  type: ApplicationCommandType.ChatInput,
  name: 'tag',
  description: 'Create, edit, delete or send a tag',
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
          description: 'The name of the tag',
          required: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'content',
          description: 'The content of the tag',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'edit',
      description: 'Edit an existing tag',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag',
          required: true,
          autocomplete: true,
        },
        {
          type: ApplicationCommandOptionType.String,
          name: 'content',
          description: 'The new content of the tag',
          required: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'remove',
      description: 'Remove an existing tag',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag',
          required: true,
          autocomplete: true,
        },
      ],
    },
    {
      type: ApplicationCommandOptionType.Subcommand,
      name: 'send',
      description: 'Send an existing tag',
      options: [
        {
          type: ApplicationCommandOptionType.String,
          name: 'name',
          description: 'The name of the tag',
          required: true,
          autocomplete: true,
        },
      ],
    },
  ],
  rate_limit: {
    type: RateLimitType.User,
    cooldown: 5,
  },
  acknowledge: true,
  async autocomplete(interaction, api) {
    const focused = getChatInputFocusedOption(interaction.data.options);
    const value = String(focused?.value).toLowerCase() ?? '';

    const { data, error } = await supabase
      .from('tags')
      .select('name')
      .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
      .ilike('name', `%${value}%`);

    if (error) throw error;

    const choices = data?.map((t) => ({ name: t.name, value: t.name })) ?? [];

    await api.interactions.createAutocompleteResponse(interaction.id, interaction.token, { choices });
  },
  async run(interaction, options, api) {
    const { create, edit, remove, send } = options;

    if (create) {
      const { name, content } = create;

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You already have a tag with that name, edit it instead with ${highlight('/tag edit', HighlightStyle.Compact)}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const id = crypto.randomUUID();

      const { error: insertError } = await supabase.from('tags').insert({
        id,
        user_id: interaction.user?.id ?? interaction.member?.user.id,
        name,
        content,
      });

      if (insertError) throw insertError;

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} Tag created successfully, you can now send it with ${highlight('/tag send', HighlightStyle.Compact)} or edit it with ${highlight('/tag edit', HighlightStyle.Compact)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (edit) {
      const { name, content } = edit;

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You don't have a tag with that name, create it first with ${highlight('/tag create', HighlightStyle.Compact)}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const { error: updateError } = await supabase
        .from('tags')
        .update({ content })
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name);

      if (updateError) throw updateError;

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} Tag edited successfully, you can now send it with ${highlight('/tag send', HighlightStyle.Compact)}`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (remove) {
      const { name } = remove;

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You don't have a tag with that name`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name);

      if (deleteError) throw deleteError;

      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} Tag deleted successfully`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else if (send) {
      const { name } = send;

      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', interaction.user?.id ?? interaction.member?.user.id)
        .eq('name', name)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} You don't have a tag with that name, create it first with ${highlight('/tag create', HighlightStyle.Compact)} and then send it with ${highlight('/tag send', HighlightStyle.Compact)}`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      const guild = interaction.guild_id ? await api.guilds.get(interaction.guild_id).catch(() => null) : null;

      if (guild) {
        await api.channels.createMessage(interaction.channel.id, {
          content: `${data.content.replace(/\\n/g, '\n')}\n-# Tag ${highlight(data.name, HighlightStyle.Compact)} requested by ${interaction.user?.username ?? interaction.member?.user.username}`,
        });

        await api.interactions.editReply(interaction.application_id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('correct')} Tag sent successfully`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      } else {
        await api.interactions.editReply(interaction.application_id, interaction.token, {
          content: data.content.replace(/\\n/g, '\n'),
        });
      }
    }
  },
});
