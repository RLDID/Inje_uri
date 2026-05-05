import { NextRequest } from 'next/server';

const BASE_URL = 'http://localhost';

export function jsonRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {},
) {
  const headers = new Headers(options.headers);
  const init: NonNullable<ConstructorParameters<typeof NextRequest>[1]> = {
    method: options.method ?? 'GET',
    headers,
  };

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json');
    init.body = JSON.stringify(options.body);
  }

  return new NextRequest(new URL(path, BASE_URL), init);
}

export function invalidJsonRequest(path: string, method = 'POST') {
  return new NextRequest(new URL(path, BASE_URL), {
    method,
    headers: { 'content-type': 'application/json' },
    body: '{',
  });
}

export function routeContext<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

export async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean;
    data?: unknown;
    error?: {
      code: string;
      message: string;
    };
  }>;
}
