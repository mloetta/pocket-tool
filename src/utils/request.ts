import { RequestMethod, RequestOptions, RequestResponse, ResponseType } from '../types/types.js';

export async function makeRequest<Type extends ResponseType>(
  url: string,
  options: RequestOptions<Type>,
): Promise<RequestResponse[Type]> {
  const parsedUrl = new URL(url);

  if (options.params) {
    parsedUrl.search = new URLSearchParams(
      Object.entries(options.params).map(([key, value]) => [key, String(value)]),
    ).toString();
  }

  const controller = new AbortController();
  const timeout = options.timeout ?? 60 * 1000;

  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(parsedUrl.toString(), {
      method: options.method,
      headers: options.headers,
      body:
        options.body !== undefined && options.method !== RequestMethod.GET ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Request failed (${res.status}): ${err}`);
    }

    switch (options.response) {
      case ResponseType.JSON: {
        return (await res.json()) as RequestResponse[Type];
      }
      case ResponseType.BUFFER: {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer) as RequestResponse[Type];
      }
      case ResponseType.TEXT: {
        return (await res.text()) as RequestResponse[Type];
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request timed out');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
