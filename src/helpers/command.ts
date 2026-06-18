import { client } from '../bot/index.js';
import type { ApplicationCommand, ChatInputOption } from '../types/types.js';

export default function createApplicationCommand<const Options extends ChatInputOption[] = ChatInputOption[]>(
  command: ApplicationCommand<Options>,
): void {
  client.commands.set(
    typeof command.name === 'string' ? command.name : command.name.global,
    command as ApplicationCommand,
  );
}
