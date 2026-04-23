import {
  APIApplicationCommandAutocompleteInteraction,
  APIChatInputApplicationCommandInteraction,
  APIMessageApplicationCommandInteraction,
  APIMessageComponentButtonInteraction,
  APIMessageComponentSelectMenuInteraction,
  APIModalSubmitInteraction,
  APIPrimaryEntryPointCommandInteraction,
  APIUserApplicationCommandInteraction,
  ApplicationCommandOptionAllowedChannelType,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  Client,
  EntryPointCommandHandlerType,
  GatewayDispatchEvents,
  GatewayDispatchPayload,
  InteractionContextType,
  LocalizationMap,
  Snowflake,
  ToEventProps,
} from '@discordjs/core';
import { Permissions } from './permissions.js';

export type Localization = (Partial<Record<keyof LocalizationMap, string>> & { global: string }) | string;

export interface BaseNonPrimaryEntryPointCommand<Type extends ApplicationCommandType> {
  type: Type;
  name: Localization;
  integration_types?: ApplicationIntegrationType[];
  contexts?: InteractionContextType[];
  default_member_permissions?: Permissions;
  rate_limit?: RateLimit;
  guild?: Snowflake;
  dev?: boolean;
  acknowledge?: boolean;
  ephemeral?: boolean;
}

export interface ChatInputCommand<
  Options extends Record<string, unknown> = Record<string, unknown>,
> extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.ChatInput> {
  description: Localization;
  options?: ChatInputOption[];
  run: (interaction: APIChatInputApplicationCommandInteraction, options: Options, client: Client) => Promise<void>;
  autocomplete?: (interaction: APIApplicationCommandAutocompleteInteraction, client: Client) => Promise<void>;
}

export type ChatInputOption =
  | AttachmentChatInputOption
  | BooleanChatInputOption
  | ChannelChatInputOption
  | IntegerChatInputOption
  | MentionableChatInputOption
  | NumberChatInputOption
  | RoleChatInputOption
  | StringChatInputOption
  | UserChatInputOption
  | SubcommandChatInputOption
  | SubcommandGroupChatInputOption;

export type BaseChatInputOption<Type extends ApplicationCommandOptionType = ApplicationCommandOptionType> = {
  type: Type;
  name: Localization;
  description: Localization;
  required?: boolean;
};

export type AttachmentChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Attachment>;

export type BooleanChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Boolean>;

export type ChannelChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Channel> & {
  channel_types?: ApplicationCommandOptionAllowedChannelType[];
};

export type IntegerChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Integer> & {
  max_value?: number;
  min_value?: number;
  choices?: Record<string, number>;
  autocomplete?: boolean;
};

export type MentionableChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Mentionable>;

export type NumberChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Number> & {
  max_value?: number;
  min_value?: number;
  choices?: ChatInputOptionChoice<ApplicationCommandOptionType.Number>[];
  autocomplete?: boolean;
};

export type RoleChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Role>;

export type StringChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.String> & {
  max_length?: number;
  min_length?: number;
  choices?: ChatInputOptionChoice<ApplicationCommandOptionType.String>[];
  autocomplete?: boolean;
};

export type UserChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.User>;

export type SubcommandChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.Subcommand> & {
  options?: ChatInputOption[];
};

export type SubcommandGroupChatInputOption = BaseChatInputOption<ApplicationCommandOptionType.SubcommandGroup> & {
  options?: SubcommandChatInputOption[];
};

export type ChatInputOptionChoice<Type extends ApplicationCommandOptionType> = {
  name: Localization;
  value: Type extends ApplicationCommandOptionType.String
    ? string
    : Type extends ApplicationCommandOptionType.Number
      ? number
      : never;
};

export interface UserContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.User> {
  run: (interaction: APIUserApplicationCommandInteraction, client: Client) => Promise<void>;
}

export interface MessageContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.Message> {
  run: (interaction: APIMessageApplicationCommandInteraction, client: Client) => Promise<void>;
}

export interface PrimaryEntryPointCommand {
  type: ApplicationCommandType.PrimaryEntryPoint;
  name: Localization;
  handler: EntryPointCommandHandlerType;
  run?: (interaction: APIPrimaryEntryPointCommandInteraction, client: Client) => Promise<void>;
}

export type NonPrimaryEntryPointCommand = ChatInputCommand | UserContextMenuCommand | MessageContextMenuCommand;

export type ApplicationCommand = NonPrimaryEntryPointCommand | PrimaryEntryPointCommand;

export interface GatewayEvent<Event extends GatewayDispatchEvents = GatewayDispatchEvents> {
  name: Event;
  run: (args: Extract<GatewayDispatchPayload, { t: Event }>['d'], client: Client) => Promise<void>;
}

export enum InteractableComponentType {
  Button = 'Button',
  Select = 'Select',
  Modal = 'Modal',
}

export type ComponentInteraction = {
  [InteractableComponentType.Button]: APIMessageComponentButtonInteraction;
  [InteractableComponentType.Select]: APIMessageComponentSelectMenuInteraction;
  [InteractableComponentType.Modal]: APIModalSubmitInteraction;
};

export interface Component<
  Type extends InteractableComponentType = InteractableComponentType,
  Args extends readonly string[] = readonly string[],
> {
  type: Type;
  customId: Snowflake;
  args?: Args;
  acknowledge?: boolean;
  run: (interaction: ComponentInteraction[Type], args: Record<Args[number], string>, client: Client) => Promise<void>;
}

export enum TimestampStyle {
  ShortTime = 't',
  MediumTime = 'T',
  ShortDate = 'd',
  LongDate = 'D',
  LongDateShortTime = 'f',
  FullDateShortTime = 'F',
  ShortDateShortTime = 's',
  ShortDateMediumTime = 'S',
  RelativeTime = 'R',
}

export enum RequestMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum ResponseType {
  TEXT = 'TEXT',
  JSON = 'JSON',
  BUFFER = 'BUFFER',
}

export type RequestOptions<Type extends ResponseType> = {
  body?: any;
  method?: RequestMethod;
  response?: Type;
  params?: { [key: string]: any };
  headers?: { [key: string]: any };
  timeout?: number;
};

export type RequestResponse = {
  [ResponseType.TEXT]: string;
  [ResponseType.JSON]: { [key: string]: any };
  [ResponseType.BUFFER]: Buffer;
};

export enum RateLimitType {
  Channel = 'Channel',
  Guild = 'Guild',
  User = 'User',
}

export interface RateLimit {
  type: RateLimitType;
  cooldown: number;
}
