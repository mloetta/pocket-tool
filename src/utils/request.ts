import http from 'http';
import https from 'https';
import { RequestMethod, RequestOptions, RequestResponse, ResponseType } from '../types/types.js';

function buildQueryString(params: Record<string, any>): string {
  return new URLSearchParams(params).toString();
}

export function makeRequest<Type extends ResponseType>(
  url: string,
  options: RequestOptions<Type>,
): Promise<RequestResponse[Type]> {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const protocol = urlObj.protocol === 'https:' ? https : http;

      if (options.params) {
        urlObj.search = buildQueryString(options.params);
      }

      const req = protocol.request(
        {
          hostname: urlObj.hostname,
          port: urlObj.port || (protocol === https ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: options.method || RequestMethod.GET,
          headers: { ...options.headers },
          timeout: options.timeout || 60000,
        },
        (res) => {
          let buffer = Buffer.alloc(0);

          res.on('data', (chunk) => (buffer = Buffer.concat([buffer, chunk])));

          res.on('end', () => {
            const status = res.statusCode ?? 0;
            if (status >= 200 && status < 300) {
              try {
                switch (options.response) {
                  case ResponseType.JSON: {
                    const text = buffer.toString('utf-8').trim();
                    resolve(text ? (JSON.parse(text) as RequestResponse[Type]) : ({} as RequestResponse[Type]));
                    break;
                  }
                  case ResponseType.BUFFER: {
                    resolve(buffer as RequestResponse[Type]);
                    break;
                  }
                  default: {
                    resolve(buffer.toString('utf-8') as RequestResponse[Type]);
                  }
                }
              } catch (e) {
                reject(new Error(`Failed to parse response: ${(e as Error).message}`));
              }
            } else {
              reject(new Error(`Request failed (${status}): ${buffer.toString('utf-8')}`));
            }
          });
        },
      );

      req.on('error', (err) => reject(new Error(`Request error: ${err.message}`)));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });

      if (options.body && options.method !== RequestMethod.GET) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    } catch (e) {
      reject(e);
    }
  });
}
