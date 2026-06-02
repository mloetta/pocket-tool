import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIChatInputApplicationCommandInteraction,
  APIMessageApplicationCommandInteraction,
  APIMessageComponentButtonInteraction,
  APIMessageComponentSelectMenuInteraction,
  APIModalSubmitInteraction,
  APIPrimaryEntryPointCommandInteraction,
  APIUserApplicationCommandInteraction,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  Client,
  ComponentType,
  GatewayDispatchEvents,
  InteractionType,
  MessageFlags,
} from '@discordjs/core';
import {
  ApplicationCommand,
  ChatInputCommand,
  Component,
  GatewayEvent,
  HighlightStyle,
  InteractableComponentType,
  MessageContextMenuCommand,
  PrimaryEntryPointCommand,
  RateLimitType,
  TimestampStyle,
  UserContextMenuCommand,
} from '../../types/types.js';
import { findCommandOption, parseCommandOptions, parseComponentArgs } from '../index.js';
import env from '../../utils/env.js';
import { checkRateLimit } from '../../utils/rateLimit.js';
import { emoji, highlight, timestamp } from '../../utils/markdown.js';
import { API } from '@discordjs/core';

export default {
  name: GatewayDispatchEvents.InteractionCreate,
  async run({ data: interaction, api, shardId }, client) {
    console.log(
      `Received interactionCreate event: ${interaction.id} (${InteractionType[interaction.type]}) from ${interaction.user?.username ?? interaction.member?.user.username} (${interaction.user?.id ?? interaction.member?.user.id})`,
    );

    if (
      env.get('maintenance').toBoolean() === true &&
      !env
        .get('dev_ids')
        .toArray()
        .includes(interaction.user?.id ?? interaction.member?.user.id)
    ) {
      await api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('exclamation')} The bot is currently under maintenance - please try again later`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      return;
    }

    switch (interaction.type) {
      case InteractionType.ApplicationCommand:
      case InteractionType.ApplicationCommandAutocomplete:
        await handleApplicationCommand(interaction, api, shardId, client);
        break;
      case InteractionType.MessageComponent:
        if (interaction.data.component_type === ComponentType.Button) {
          await handleButton(interaction as APIMessageComponentButtonInteraction, api, shardId, client);
        } else {
          await handleSelectMenu(interaction as APIMessageComponentSelectMenuInteraction, api, shardId, client);
        }
        break;
      case InteractionType.ModalSubmit:
        await handleModal(interaction, api, shardId, client);
        break;
    }
  },
} satisfies GatewayEvent<GatewayDispatchEvents.InteractionCreate>;

async function handleApplicationCommand(
  interaction: APIApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction,
  api: API,
  shardId: number,
  client: Client,
) {
  if (!interaction.data) {
    return;
  }

  const command = client.commands.get(interaction.data.name) as ApplicationCommand;

  if (!command) {
    await api.interactions.reply(interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${emoji('exclamation')} The command: ${highlight(interaction.data.name, HighlightStyle.Bold)} was not found`,
        },
        {
          type: ComponentType.Separator,
        },
      ],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });

    return;
  }

  if (
    'dev' in command &&
    command.dev &&
    !env
      .get('dev_ids')
      .toArray()
      .includes(interaction.user?.id ?? interaction.member?.user.id)
  ) {
    return;
  }

  try {
    if (interaction.type === InteractionType.ApplicationCommand) {
      switch (interaction.data.type) {
        case ApplicationCommandType.ChatInput: {
          const chatInput = command as ChatInputCommand;

          if (chatInput.rate_limit) {
            switch (chatInput.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(interaction.channel.id, interaction.data.name, chatInput.rate_limit);

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} <#${interaction.channel.id}> is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.Guild: {
                const result = checkRateLimit(interaction.guild!.id, interaction.data.name, chatInput.rate_limit);

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.User: {
                const result = checkRateLimit(
                  (interaction.user?.id ?? interaction.member?.user.id)!,
                  interaction.data.name,
                  chatInput.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
            }
          }

          const option = findCommandOption(interaction.data.options ?? [], 'incognito');

          const incognito = option?.type === ApplicationCommandOptionType.Boolean ? option.value === true : false;

          if (chatInput.acknowledge) {
            await api.interactions.defer(interaction.id, interaction.token, {
              flags: chatInput.ephemeral || incognito ? MessageFlags.Ephemeral : undefined,
            });
          }

          await chatInput.run(
            {
              data: interaction as APIChatInputApplicationCommandInteraction,
              api,
              shardId,
            },
            parseCommandOptions(interaction as APIChatInputApplicationCommandInteraction),
            client,
          );
          break;
        }
        case ApplicationCommandType.Message: {
          const messageContextMenu = command as MessageContextMenuCommand;

          if (messageContextMenu.rate_limit) {
            switch (messageContextMenu.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(
                  interaction.channel.id,
                  interaction.data.name,
                  messageContextMenu.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} <#${interaction.channel.id}> is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.Guild: {
                const result = checkRateLimit(
                  interaction.guild!.id,
                  interaction.data.name,
                  messageContextMenu.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.User: {
                const result = checkRateLimit(
                  (interaction.user?.id ?? interaction.member?.user.id)!,
                  interaction.data.name,
                  messageContextMenu.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
            }
          }

          if (messageContextMenu.acknowledge) {
            await api.interactions.defer(interaction.id, interaction.token, {
              flags: messageContextMenu.ephemeral ? MessageFlags.Ephemeral : undefined,
            });
          }

          await messageContextMenu.run(
            {
              data: interaction as APIMessageApplicationCommandInteraction,
              api,
              shardId,
            },
            client,
          );
          break;
        }
        case ApplicationCommandType.User: {
          const userContextMenu = command as UserContextMenuCommand;

          if (userContextMenu.rate_limit) {
            switch (userContextMenu.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(
                  interaction.channel.id,
                  interaction.data.name,
                  userContextMenu.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} <#${interaction.channel.id}> is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.Guild: {
                const result = checkRateLimit(interaction.guild!.id, interaction.data.name, userContextMenu.rate_limit);

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
              case RateLimitType.User: {
                const result = checkRateLimit(
                  (interaction.user?.id ?? interaction.member?.user.id)!,
                  interaction.data.name,
                  userContextMenu.rate_limit,
                );

                if (!result.executable) {
                  await api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${emoji('exclamation')} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again`,
                      },
                      {
                        type: ComponentType.Separator,
                      },
                    ],
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                  });

                  return;
                }
                break;
              }
            }
          }

          if (userContextMenu.acknowledge) {
            await api.interactions.defer(interaction.id, interaction.token, {
              flags: userContextMenu.ephemeral ? MessageFlags.Ephemeral : undefined,
            });
          }

          await userContextMenu.run(
            {
              data: interaction as APIUserApplicationCommandInteraction,
              api,
              shardId,
            },
            client,
          );
          break;
        }
        case ApplicationCommandType.PrimaryEntryPoint: {
          const primaryEntryPoint = command as PrimaryEntryPointCommand;

          if (primaryEntryPoint.run) {
            await primaryEntryPoint.run(
              {
                data: interaction as APIPrimaryEntryPointCommandInteraction,
                api,
                shardId,
              },
              client,
            );
          }

          break;
        }
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      if ('autocomplete' in command && command.autocomplete) {
        await command.autocomplete(
          {
            data: interaction as APIApplicationCommandAutocompleteInteraction,
            api,
            shardId,
          },
          client,
        );
      }
    }
  } catch (e) {
    console.error(`Command ${interaction.data.name} encountered an error:`, e);

    if ('acknowledge' in command && command.acknowledge) {
      await api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('wrong')} The command: </${interaction.data.name}:${interaction.data.id}> has encountered an error - please try again later\n-# If the issue persists, please report it to the developers by using </help:1494455586631188562>`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${emoji('wrong')} The command: </${interaction.data.name}:${interaction.data.id}> has encountered an error - please try again later\n-# If the issue persists, please report it to the developers by using </help:1494455586631188562>`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }
  }
}

async function handleButton(
  interaction: APIMessageComponentButtonInteraction,
  api: API,
  shardId: number,
  client: Client,
) {
  const args = interaction.data.custom_id?.split('_') ?? [];
  const customId = args.shift();

  if (!customId) return;

  const button = client.components.get(customId) as Component<InteractableComponentType.Button>;

  if (!button) return;

  if (button.acknowledge) {
    await api.interactions.deferMessageUpdate(interaction.id, interaction.token);
  }

  try {
    await button.run(
      {
        data: interaction,
        api,
        shardId,
      },
      parseComponentArgs(button, args),
      client,
    );
  } catch (e) {
    console.error(`Button ${customId} encountered an error:`, e);
  }
}

async function handleSelectMenu(
  interaction: APIMessageComponentSelectMenuInteraction,
  api: API,
  shardId: number,
  client: Client,
) {
  const args = interaction.data.custom_id?.split('_') ?? [];
  const customId = args.shift();

  if (!customId) return;

  const selectMenu = client.components.get(customId) as Component<InteractableComponentType.SelectMenu>;

  if (!selectMenu) return;

  if (selectMenu.acknowledge) {
    await api.interactions.deferMessageUpdate(interaction.id, interaction.token);
  }

  try {
    await selectMenu.run(
      {
        data: interaction,
        api,
        shardId,
      },
      parseComponentArgs(selectMenu, args),
      client,
    );
  } catch (e) {
    console.error(`Select menu ${customId} encountered an error:`, e);
  }
}

async function handleModal(interaction: APIModalSubmitInteraction, api: API, shardId: number, client: Client) {
  const args = interaction.data.custom_id?.split('_') ?? [];
  const customId = args.shift();

  if (!customId) return;

  const modal = client.components.get(customId) as Component<InteractableComponentType.Modal>;

  if (!modal) return;

  try {
    await modal.run(
      {
        data: interaction,
        api,
        shardId,
      },
      parseComponentArgs(modal, args),
      client,
    );
  } catch (e) {
    console.error(`Modal ${customId} encountered an error:`, e);
  }
}
