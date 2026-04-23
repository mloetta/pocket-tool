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

/** Returns a default bold inline pill for Discord.
 *
 * @param content The content to wrap in a pill.
 */
export function pill(content: any): string {
  return '**` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `**';
}

/** Returns a small inline pill for Discord.
 *
 * @param content The content to wrap in a small pill.
 */
export function smallPill(content: any): string {
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

/** Returns a bold inline pill with an icon.
 *
 * @param icon The icon to resolve.
 * @param content The content to wrap in a pill.
 */
export function iconPill(icon: Emoji, content: any): string {
  return _icon(icon) + '**` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `**';
}

/** Returns a small inline pill with an icon.
 *
 * @param icon The icon to resolve.
 * @param content The content to wrap in a small pill.
 */
export function smallIconPill(icon: Emoji, content: any): string {
  return _icon(icon) + '` ' + _escapeCodeblock(content).replace(/ /g, ' ') + ' `';
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

/** Returns a link wrapped in a Discord pill.
 *
 * @param url The URL to link to.
 * @param content The content to wrap in a pill.
 * @param tooltip The tooltip to display when hovering over the link.
 * @param embed Whether to embed the link.
 */
export function linkPill(url: string, content: any = '', tooltip: string = ''): string {
  if (tooltip.length) {
    tooltip = ` '${tooltip}'`;
  }

  if (content) {
    return `[**\` ${_escapeCodeblock(content)} \`**](${url.replace(/\)/g, '\\)')}${tooltip})`;
  }

  return url;
}

/** Returns a pill link with an icon.
 *
 * @param icon The icon to display.
 * @param url The URL to link to.
 * @param content The content to wrap in a pill.
 * @param tooltip The tooltip to display when hovering over the link.
 */
export function iconLinkPill(icon: Emoji, url: string, content: any = '', tooltip: string = ''): string {
  if (tooltip.length) {
    tooltip = ` '${tooltip}'`;
  }

  if (content) {
    return `${_icon(icon)} [**\` ${_escapeCodeblock(content)} \`**](${url.replace(/\)/g, '\\)')}${tooltip})`;
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

/** Trims a string to a specified maximum length, optionally replacing newlines with spaces.
 *
 * @param content The string to trim.
 * @param length The maximum length of the string.
 * @param newlines Whether to replace newlines with spaces.
 */
export function stringwrap(content = '', length: number, newlines: boolean = true): string {
  if (!newlines) {
    content = content.replace(/\n/g, ' ');
  }

  if (content.length > length) {
    let c = content.slice(0, length) + '...';
    while (c.endsWith(' ...')) c = c.slice(0, -4) + '...';
    return c;
  }

  return content;
}

/**
 * Trims a string to the specified maximum length without breaking words, optionally replacing newlines with spaces.
 * Alternative to {@link stringwrap}.
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

/** Returns a citation superscript optionally linking to a URL.
 *
 * @param number The citation number.
 * @param url The URL to link to.
 * @param tooltip The tooltip to display on hover.
 */
export function citation(number = 1, url: string, tooltip: string = ''): string {
  const Superscript = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

  let formatted = '';
  for (const n of number.toString().split('')) {
    formatted += Superscript[parseInt(n)];
  }

  if (url) {
    if (tooltip.length) {
      if (tooltip.endsWith(' ')) {
        tooltip = tooltip.slice(0, -1);
      }

      tooltip = ` '${tooltip.replace(/["*]/g, '')}'`;
    }

    return `[⁽${formatted}⁾](${url.replace(/\)/g, '\\)')}${tooltip})`;
  }

  return `⁽${formatted}⁾`;
}

/** Attemps to format multiple columns into inline Discord fields.
 *
 * @param cols The columns to format.
 * @param options The formatting options.
 */
export function inline(cols: string[][], options?: { spacing?: number }) {
  options = options ?? {};
  const spacing = Math.max(options.spacing ?? 1);

  const lengths = cols[0]!.map((_, colIndex) => Math.max(...cols.map((row) => (row[colIndex] ?? '').length)));

  let lines = cols.map((row) => row.map((cell, i) => (cell ?? '').padEnd(lengths[i]! + spacing, ' ')).join(''));

  return lines;
}

/** Returns a favicon URL.
 *
 * @param url The URL to get the favicon for.
 * @param size The size of the favicon.
 */
export function favicon(url: string, size: number = 256): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=${size}`;
}
