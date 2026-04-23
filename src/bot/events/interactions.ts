import {
  APIApplicationCommandAutocompleteInteraction,
  APIApplicationCommandInteraction,
  APIChatInputApplicationCommandInteraction,
  APIMessageApplicationCommandInteraction,
  APIMessageComponentButtonInteraction,
  APIMessageComponentInteraction,
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
  GatewayEvent,
  MessageContextMenuCommand,
  PrimaryEntryPointCommand,
  RateLimitType,
  TimestampStyle,
  UserContextMenuCommand,
} from '../../types/types.js';
import { parseCommandOptions, parseComponentArgs } from '../index.js';
import { icon, pill, timestamp } from '../../utils/markdown.js';
import { Emoji } from '../../types/emojis.js';
import env from '../../utils/env.js';
import { checkRateLimit } from '../../utils/rateLimit.js';

export default {
  name: GatewayDispatchEvents.InteractionCreate,
  async run(interaction, client) {
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
      await client.api.interactions.reply(interaction.id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Exclamation)} The bot is currently under maintenance. Please try again later.`,
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
        await handleApplicationCommand(interaction, client);
        break;
      case InteractionType.MessageComponent:
      case InteractionType.ModalSubmit:
        await handleComponent(interaction, client);
        break;
    }
  },
} satisfies GatewayEvent<GatewayDispatchEvents.InteractionCreate>;

async function handleApplicationCommand(
  interaction: APIApplicationCommandInteraction | APIApplicationCommandAutocompleteInteraction,
  client: Client,
) {
  if (!interaction.data) {
    return;
  }

  let command = client.commands.get(interaction.data.name) as ApplicationCommand;
  if (!command) {
    await client.api.interactions.reply(interaction.id, interaction.token, {
      components: [
        {
          type: ComponentType.TextDisplay,
          content: `${icon(Emoji.Exclamation)} The command: ${pill(interaction.data.name)} was not found.`,
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
          command = command as ChatInputCommand;

          if (command.rate_limit) {
            switch (command.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(interaction.channel.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This channel is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                const result = checkRateLimit(interaction.guild!.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                  command.rate_limit,
                );
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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

          const option = interaction.data.options?.find(
            (o) => o.name === 'incognito' && o.type === ApplicationCommandOptionType.Boolean,
          );

          const incognito = option?.type === ApplicationCommandOptionType.Boolean ? Boolean(option.value) : false;

          if (command.acknowledge) {
            await client.api.interactions.defer(interaction.id, interaction.token, {
              flags: command.ephemeral || incognito ? MessageFlags.Ephemeral : undefined,
            });
          }

          await (command as ChatInputCommand).run(
            interaction as APIChatInputApplicationCommandInteraction,
            parseCommandOptions(interaction as APIChatInputApplicationCommandInteraction),
            client,
          );
          break;
        }
        case ApplicationCommandType.Message: {
          command = command as MessageContextMenuCommand;

          if (command.rate_limit) {
            switch (command.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(interaction.channel.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This channel is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                const result = checkRateLimit(interaction.guild!.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                  command.rate_limit,
                );
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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

          if (command.acknowledge) {
            await client.api.interactions.defer(interaction.id, interaction.token, {
              flags: command.ephemeral ? MessageFlags.Ephemeral : undefined,
            });
          }

          await command.run(interaction as APIMessageApplicationCommandInteraction, client);
          break;
        }
        case ApplicationCommandType.User: {
          command = command as UserContextMenuCommand;

          if (command.rate_limit) {
            switch (command.rate_limit.type) {
              case RateLimitType.Channel: {
                const result = checkRateLimit(interaction.channel.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This channel is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                const result = checkRateLimit(interaction.guild!.id, interaction.data.name, command.rate_limit);
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} This guild is currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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
                  command.rate_limit,
                );
                if (!result.executable) {
                  await client.api.interactions.reply(interaction.id, interaction.token, {
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `${icon(Emoji.Exclamation)} You're currently rate limited! Please wait ${timestamp(result.remaining, TimestampStyle.RelativeTime)} before using </${interaction.data.name}:${interaction.data.id}> again.`,
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

          if (command.acknowledge) {
            await client.api.interactions.defer(interaction.id, interaction.token, {
              flags: command.ephemeral ? MessageFlags.Ephemeral : undefined,
            });
          }

          await command.run(interaction as APIUserApplicationCommandInteraction, client);
          break;
        }
        case ApplicationCommandType.PrimaryEntryPoint: {
          command = command as PrimaryEntryPointCommand;

          if (command.run) {
            await command.run(interaction as APIPrimaryEntryPointCommandInteraction, client);
          }

          break;
        }
      }
    } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      if ('autocomplete' in command && command.autocomplete) {
        await command.autocomplete(interaction as APIApplicationCommandAutocompleteInteraction, client);
      }
    }
  } catch (e) {
    console.error(`Command ${interaction.data.name} encountered an error:`, e);

    if ('acknowledge' in command && command.acknowledge) {
      await client.api.interactions.editReply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Wrong)} The command: </${interaction.data.name}:${interaction.data.id}> has encountered an error. Please try again later.\n-# If the issue persists, please report it to the developers by using </help:1494455586631188562>.`,
          },
          {
            type: ComponentType.Separator,
          },
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    } else {
      await client.api.interactions.reply(interaction.application_id, interaction.token, {
        components: [
          {
            type: ComponentType.TextDisplay,
            content: `${icon(Emoji.Wrong)} The command: </${interaction.data.name}:${interaction.data.id}> has encountered an error. Please try again later.\n-# If the issue persists, please report it to the developers by using </help:1494455586631188562>.`,
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

async function handleComponent(
  interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
  client: Client,
) {
  if (!interaction.data) {
    return;
  }

  const args = interaction.data.custom_id?.split('_') ?? [];
  const customId = args.shift();
  if (!customId) {
    return;
  }

  let component = client.components.get(customId);
  if (!component) {
    return;
  }

  if (component.acknowledge) {
    await client.api.interactions.deferMessageUpdate(interaction.id, interaction.token);
  }

  try {
    if (interaction.type === InteractionType.MessageComponent) {
      if (interaction.data.component_type === ComponentType.Button) {
        await component.run(
          interaction as APIMessageComponentButtonInteraction,
          parseComponentArgs(component, args),
          client,
        );
      } else if (
        [
          ComponentType.RoleSelect,
          ComponentType.UserSelect,
          ComponentType.StringSelect,
          ComponentType.ChannelSelect,
          ComponentType.MentionableSelect,
        ].includes(interaction.data.component_type)
      ) {
        await component.run(
          interaction as APIMessageComponentSelectMenuInteraction,
          parseComponentArgs(component, args),
          client,
        );
      }
    } else {
      await component.run(interaction as APIModalSubmitInteraction, parseComponentArgs(component, args), client);
    }
  } catch (e) {
    console.error(`Component ${component.customId} encountered an error:`, e);
  }
}
