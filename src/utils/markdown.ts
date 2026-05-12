import { TimestampStyle } from '../types/types.js';
import type { Emoji } from '../types/emojis.js';

/** Escapes backticks in a string to avoid breaking codeblocks. */
function _escapeCodeblock(content: any): string {
  return String(content ?? '').replace(/`/g, 'ˋ');
}

/** Resolves an internal emoji/icon from the Emoji object. */
function _icon(icon: Emoji): string {
  if (!icon) {
    throw new Error(`Icon ${icon} not found`);
  }

  return icon.replace(/:[a-zA-Z0-9_]*:/, ':i:');
}

/** Wraps content in a Discord codeblock with optional language.
 *
 * @param type The language to highlight the codeblock with.
 * @param content The content to wrap in a codeblock.
 */
export function codeblock(type: string, content: any): string {
  if (!Array.isArray(content)) {
    content = [content];
  }

  if (!content.length) {
    return '```' + type + '```';
  }

  return '```' + type + '\n' + _escapeCodeblock(content.join('\n')) + '```';
}

/** Returns a default bold inline highlight for Discord.
 *
 * @param content The content to highlight.
 */
export function highlight(content: any): string {
  return '**` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `**';
}

/** Returns a small inline highlight for Discord.
 *
 * @param content The content to highlight.
 */
export function smallHighlight(content: any): string {
  return '` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `';
}

/** Resolves an icon from the Emoji object.
 *
 * @param icon The icon to resolve.
 */
export function icon(icon: Emoji): string {
  return _icon(icon);
}

/** Returns a Discord emoji object from an icon key.
 *
 * @param icon The icon to resolve.
 * @returns An emoji object with id, name, and animated properties.
 */
export function iconAsEmoji(icon: Emoji): {
  id: string;
  name: string;
  animated: boolean;
} {
  let i = _icon(icon);

  return {
    id: i?.replace(/<a?:[a-z0-9_]*:([0-9]*)>/g, '$1'),
    name: 'i',
    animated: i?.startsWith('<a:'),
  };
}

/** Returns a formatted Discord markdown link.
 *
 * @param url The URL to link to.
 * @param masked The text to display as the link.
 * @param tooltip The tooltip to display when hovering over the link.
 * @param embed Whether to embed the link.
 */
export function link(url: string, masked: string, tooltip: string = '', embed: boolean = false): string {
  if (tooltip.length) {
    tooltip = ` '${tooltip}'`;
  }

  if (masked && !embed) {
    return `[${masked}](<${url.replace(/\)/g, '\\)')}>${tooltip})`;
  }

  if (masked && embed) {
    return `[${masked}](${url.replace(/\)/g, '\\)')}${tooltip})`;
  }

  return url;
}

/** Returns a Discord timestamp markdown.
 *
 * @param time The time, in milliseconds, to format.
 * @param flag The style of the timestamp.
 */
export function timestamp(time: number, flag: TimestampStyle = TimestampStyle.ShortTime): string {
  return `<t:${Math.floor(time / 1000)}:${flag}>`;
}

/**
 * Trims a string to the specified maximum length without breaking words, optionally replacing newlines with spaces.
 *
 * @param content The string to trim.
 * @param length The maximum length of the string.
 * @param newLines Whether to replace newlines with spaces.
 */
export function stringwrapPreserveWords(content = '', length: number, newLines: boolean = true): string {
  if (!newLines) {
    content = content.replace(/\n/g, ' ');
  }

  if (content.length <= length) {
    return content;
  }

  let c = content.split(' ');
  while (c.join(' ').length + (c.length - 1) > length - 1) {
    c.pop();
  }

  return c.join(' ') + '...';
}

const CDN = 'https://cdn.discordapp.com';

/** Returns a CDN URL for the given route.
 *
 * @param route The route to get the CDN URL for.
 * @param size The size of the image.
 * @param format The format of the image.
 * @param animated Whether the image is animated.
 */
export function cdn(route: string, size: number = 4096, format: string = 'webp', animated: boolean = false): string {
  return `${CDN}${route}.${format}?size=${size}&animated=${animated}`;
}
