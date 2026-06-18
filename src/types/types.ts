import {
  API,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ApplicationIntegrationType,
  EntryPointCommandHandlerType,
  GatewayDispatchEvents,
  InteractionContextType,
  type APIApplicationCommandAutocompleteInteraction,
  type APIAttachment,
  type APIChannel,
  type APIChatInputApplicationCommandInteraction,
  type APIInteractionDataResolvedGuildMember,
  type APIMessageApplicationCommandInteraction,
  type APIMessageComponentButtonInteraction,
  type APIMessageComponentSelectMenuInteraction,
  type APIModalSubmitInteraction,
  type APIPrimaryEntryPointCommandInteraction,
  type APIRole,
  type APIUser,
  type APIUserApplicationCommandInteraction,
  type ApplicationCommandOptionAllowedChannelType,
  type GatewayDispatchPayload,
  type LocalizationMap,
  type Snowflake,
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
  Options extends ChatInputOption[] = ChatInputOption[],
> extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.ChatInput> {
  description: Localization;
  options?: Options;
  run: (
    interaction: APIChatInputApplicationCommandInteraction,
    options: GetChatInputCommandOptions<Options>,
    api: API,
  ) => Promise<void>;
  autocomplete?: (interaction: APIApplicationCommandAutocompleteInteraction, api: API) => Promise<void>;
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

export interface InteractionResolvedUser {
  user: APIUser;
  member?: APIInteractionDataResolvedGuildMember;
}

export interface TypeToResolvedMap {
  [ApplicationCommandOptionType.String]: string;
  [ApplicationCommandOptionType.Integer]: number;
  [ApplicationCommandOptionType.Boolean]: boolean;
  [ApplicationCommandOptionType.User]: InteractionResolvedUser;
  [ApplicationCommandOptionType.Channel]: APIChannel;
  [ApplicationCommandOptionType.Role]: APIRole;
  [ApplicationCommandOptionType.Mentionable]: APIRole | InteractionResolvedUser;
  [ApplicationCommandOptionType.Number]: number;
  [ApplicationCommandOptionType.Attachment]: APIAttachment;
}

export type SubCommandApplicationCommand =
  | ApplicationCommandOptionType.Subcommand
  | ApplicationCommandOptionType.SubcommandGroup;

export type ConvertTypeToResolved<Type extends keyof TypeToResolvedMap> = TypeToResolvedMap[Type];

export type GetOptionName<Option> = Option extends { name: string }
  ? Option['name']
  : Option extends { name: { global: string } }
    ? Option['name']['global']
    : never;

export type BuildOptions<Options extends ChatInputOption[] | undefined> = {
  [Index in keyof Omit<Options, keyof unknown[]> as GetOptionName<Options[Index]>]: GetOptionValue<Options[Index]>;
};

export type GetOptionValue<Option> = Option extends {
  type: ApplicationCommandOptionType;
  required?: boolean;
}
  ? Option extends {
      type: SubCommandApplicationCommand;
      options?: ChatInputOption[];
    }
    ? BuildOptions<Option['options']>
    : Option['type'] extends keyof TypeToResolvedMap
      ? ConvertTypeToResolved<Option['type']> | (Option['required'] extends true ? never : undefined)
      : never
  : never;

export type GetChatInputCommandOptions<Options extends ChatInputOption[]> = Options extends ChatInputOption[]
  ? { [Index in keyof BuildOptions<Options> as Index]: BuildOptions<Options>[Index] }
  : never;

export interface UserContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.User> {
  run: (interaction: APIUserApplicationCommandInteraction, api: API) => Promise<void>;
}

export interface MessageContextMenuCommand extends BaseNonPrimaryEntryPointCommand<ApplicationCommandType.Message> {
  run: (interaction: APIMessageApplicationCommandInteraction, api: API) => Promise<void>;
}

export interface PrimaryEntryPointCommand {
  type: ApplicationCommandType.PrimaryEntryPoint;
  name: Localization;
  handler: EntryPointCommandHandlerType;
  run?: (interaction: APIPrimaryEntryPointCommandInteraction, api: API) => Promise<void>;
}

export type NonPrimaryEntryPointCommand<Options extends ChatInputOption[] = ChatInputOption[]> =
  | ChatInputCommand<Options>
  | UserContextMenuCommand
  | MessageContextMenuCommand;

export type ApplicationCommand<Options extends ChatInputOption[] = ChatInputOption[]> =
  | NonPrimaryEntryPointCommand<Options>
  | PrimaryEntryPointCommand;

export interface GatewayEvent<Event extends GatewayDispatchEvents = GatewayDispatchEvents> {
  name: Event;
  run: (args: Extract<GatewayDispatchPayload, { t: Event }>['d'], api: API) => Promise<void>;
}

export enum InteractableComponentType {
  Button = 'button',
  SelectMenu = 'select_menu',
  Modal = 'modal',
}

export interface BaseComponent<
  Type extends InteractableComponentType = InteractableComponentType,
  Args extends readonly string[] = readonly string[],
> {
  type: Type;
  custom_id: Snowflake;
  args?: Args;
}

export interface ButtonComponent<Args extends readonly string[] = readonly string[]> extends BaseComponent<
  InteractableComponentType.Button,
  Args
> {
  acknowledge?: boolean;
  run: (
    interaction: APIMessageComponentButtonInteraction,
    args: Record<Args[number], string>,
    api: API,
  ) => Promise<void>;
}

export interface SelectMenuComponent<Args extends readonly string[] = readonly string[]> extends BaseComponent<
  InteractableComponentType.SelectMenu,
  Args
> {
  acknowledge?: boolean;
  run: (
    interaction: APIMessageComponentSelectMenuInteraction,
    args: Record<Args[number], string>,
    api: API,
  ) => Promise<void>;
}

export interface ModalComponent<Args extends readonly string[] = readonly string[]> extends BaseComponent<
  InteractableComponentType.Modal,
  Args
> {
  run: (interaction: APIModalSubmitInteraction, args: Record<Args[number], string>, api: API) => Promise<void>;
}

export type Component<Args extends readonly string[] = readonly string[]> =
  | ButtonComponent<Args>
  | SelectMenuComponent<Args>
  | ModalComponent<Args>;

export enum TimestampStyle {
  /**	16:20 */
  ShortTime = 't',
  /**	16:20:30 */
  MediumTime = 'T',
  /**	20/04/2021 */
  ShortDate = 'd',
  /**	April 20, 2021 */
  LongDate = 'D',
  /**	April 20, 2021 at 16:20 */
  LongDateShortTime = 'f',
  /**	Tuesday, April 20, 2021 at 16:20 */
  FullDateShortTime = 'F',
  /**	20/04/2021, 16:20 */
  ShortDateShortTime = 's',
  /**	20/04/2021, 16:20:30 */
  ShortDateMediumTime = 'S',
  /**	4 years ago */
  RelativeTime = 'R',
}

export enum HighlightStyle {
  Bold = 'bold',
  Compact = 'compact',
  Default = 'default',
}

export enum RequestMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
}

export enum ResponseType {
  TEXT = 'text',
  JSON = 'json',
  BUFFER = 'buffer',
}

export type RequestOptions<Type extends ResponseType> = {
  method: RequestMethod;
  response: Type;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  body?: unknown;
  timeout?: number;
};

export type RequestResponse = {
  [ResponseType.TEXT]: string;
  [ResponseType.JSON]: any;
  [ResponseType.BUFFER]: Buffer;
};

export enum RateLimitType {
  Channel = 'channel',
  Guild = 'guild',
  User = 'user',
}

export interface RateLimit {
  type: RateLimitType;
  cooldown: number;
}

export interface ShardInformation {
  latency?: number;
  uptime?: number;
}

export interface Reminder {
  id: string;
  user_id: string;
  time: Date;
  reason?: string | undefined;
}

export interface Track {
  buffer: Buffer;
  onFinish?: () => void;
  onError?: (error: Error) => void;
}
