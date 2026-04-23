import { join } from 'path';
import { pathToFileURL } from 'url';
import { readdir } from 'fs/promises';

export async function readDirectory<Type>(folder: string): Promise<Type[]> {
  const files = await readdir(folder, { recursive: true });

  const imported: Type[] = [];

  for (const filename of files) {
    if (!filename.endsWith('.js')) {
      continue;
    }

    const fullPath = join(folder, filename);

    try {
      const result = await import(pathToFileURL(fullPath).href);

      if (!result.default) {
        console.error(`Missing default export in ${fullPath}`);
        continue;
      }

      imported.push(result.default);
    } catch (e) {
      console.error(`Cannot import file (${fullPath}) for reason:`, e);
    }
  }

  return imported;
}

export const hasPermission = (permissions: bigint, permission: bigint) => (permissions & permission) === permission;
