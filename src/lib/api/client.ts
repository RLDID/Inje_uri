import type { ApiResponse } from '@/lib/types';

type RequestBody = BodyInit | Record<string, unknown> | unknown[] | null | undefined;

interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  body?: RequestBody;
}

function getErrorMessage(response: ApiResponse<unknown>, fallback: string): string {
  return response.error?.message || fallback;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const text = await response.text();
  if (!text) {
    return { success: response.ok, data: undefined as T };
  }

  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'API 응답을 해석할 수 없습니다.',
      },
    };
  }
}

function buildBodyAndHeaders(body: RequestBody, headers: Headers): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (typeof body === 'string' || body instanceof Blob || body instanceof URLSearchParams) {
    return body;
  }

  headers.set('Content-Type', 'application/json');
  return JSON.stringify(body);
}

async function apiRequest<T>(path: string, method: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const body = buildBodyAndHeaders(options.body, headers);

  const response = await fetch(path, {
    ...options,
    method,
    headers,
    body,
    credentials: 'include',
  });

  const payload = await parseJsonResponse<T>(response);

  if (!response.ok || !payload.success) {
    throw new Error(getErrorMessage(payload, response.statusText || '요청을 처리하지 못했습니다.'));
  }

  return payload.data as T;
}

export function apiGet<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, 'GET', options);
}

export function apiPost<T>(path: string, body?: RequestBody, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, 'POST', { ...options, body });
}

export function apiPatch<T>(path: string, body?: RequestBody, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, 'PATCH', { ...options, body });
}

export function apiDelete<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(path, 'DELETE', options);
}
