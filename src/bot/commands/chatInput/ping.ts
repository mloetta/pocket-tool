import { ApplicationCommandType, ApplicationIntegrationType, InteractionContextType } from '@discordjs/core';
import { ChatInputCommand } from '../../../types/types.js';
import { shardLatency } from '../../index.js';
import { getShardIdFromGuildId } from '../../../utils/utils.js';

export default {
  type: ApplicationCommandType.ChatInput,
  name: 'ping',
  description: 'Pong!',
  integration_types: [ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall],
  contexts: [InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel],
  acknowledge: true,
  async run(interaction, options, client) {
    // gateway latency
    const shardId = interaction.guild_id
      ? getShardIdFromGuildId(interaction.guild_id, await client.gateway.getShardCount())
      : 0;
    const gatewayLatency = shardLatency.get(shardId)?.toLocaleString('en-US');

    // REST latency
    const originalResponse = await client.api.interactions.getOriginalReply(
      interaction.application_id,
      interaction.token,
    );
    const restLatency = originalResponse.timestamp ? Date.now() - new Date(originalResponse.timestamp).getTime() : 0;

    await client.api.interactions.editReply(interaction.application_id, interaction.token, {
      content: `Pong!\n-# Gateway: **${gatewayLatency ?? '0'}ms** - REST: **${restLatency ?? '0'}ms**`,
    });
  },
} satisfies ChatInputCommand;
