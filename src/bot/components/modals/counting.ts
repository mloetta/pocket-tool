import { ComponentType, MessageFlags } from '@discordjs/core';
import createComponent from '../../../helpers/component.js';
import { InteractableComponentType } from '../../../types/types.js';
import { supabase } from '../../../utils/supabase.js';
import { emoji } from '../../../utils/markdown.js';

createComponent({
  type: InteractableComponentType.Modal,
  custom_id: 'counting',
  async run(interaction, args, api) {
    const components = interaction.data?.components;

    const channel =
      components![0]!.type === ComponentType.Label
        ? components![0]!.component?.type === ComponentType.ChannelSelect
          ? components![0]!.component.values[0]
          : undefined
        : undefined;

    const action =
      components![1]!.type === ComponentType.Label
        ? components![1]!.component?.type === ComponentType.RadioGroup
          ? components![1]!.component.value
          : undefined
        : undefined;

    const extras =
      components![2]!.type === ComponentType.Label
        ? components![2]!.component?.type === ComponentType.CheckboxGroup
          ? components![2]!.component.values
          : undefined
        : undefined;

    const del =
      components![4]!.type === ComponentType.Label
        ? components![4]!.component?.type === ComponentType.Checkbox
          ? components![4]!.component.value
          : undefined
        : undefined;

    if (del) {
      const { data, error } = await supabase.from('counting').select('*').eq('guild_id', interaction.guild_id).maybeSingle();

      if (error) throw error;

      if (!data) {
        await api.interactions.reply(interaction.id, interaction.token, {
          components: [
            {
              type: ComponentType.TextDisplay,
              content: `${emoji('exclamation')} There is no counting data to delete`,
            },
            {
              type: ComponentType.Separator,
            },
          ],
          flags: MessageFlags.IsComponentsV2,
        });

        return;
      }

      await supabase.from('counting').delete().eq('guild_id', interaction.guild_id);

      await api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('correct')} Counting data was successfully deleted!`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    if (!channel) {
      await api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} Please select a valid channel for the counting minigame`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });

      return;
    }

    const { error } = await supabase.from('counting').upsert({
      guild_id: interaction.guild_id,
      channel_id: channel,
      action,
      extras,
    });

    if (error) throw error;

    await api.interactions.reply(interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${emoji('correct')} Counting minigame was successfully set up!`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
});
