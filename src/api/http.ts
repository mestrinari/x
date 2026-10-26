import { apiConfig } from './config';

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly details: unknown;

  constructor(message: string, status: number, url: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.url = url;
    this.details = details;
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = apiConfig.baseUrl;
  const url = /^https?:\/\//i.test(base)
    ? new URL(`${base}${normalizedPath}`)
    : new URL(`${base}${normalizedPath}`, window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  return url.toString();
}

async function readPayload(response: Response) {
  const text = await response.text();
  if (!text) return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    const data = payload as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
    if (data.errors && typeof data.errors === 'object') return Object.values(data.errors).flat().join(' ');
    if (typeof data.title === 'string') return data.title;
  }
  return fallback;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = buildUrl(path, options.query);
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? apiConfig.timeoutMs);

  const abort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) controller.abort();
    else options.signal.addEventListener('abort', abort, { once: true });
  }

  const headers = new Headers(options.headers);
  const actor = window.localStorage?.getItem('orbit.operator');
  if (actor && /^[1-9]\d*$/.test(actor) && options.method && options.method !== 'GET')
    headers.set('X-Usuario-Id', actor);
  headers.set('Accept', 'application/json, text/plain, */*');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  try {
    const response = await fetch(url, {
      ...options,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: options.credentials ?? apiConfig.credentials,
      headers,
      signal: controller.signal,
    });
    const payload = await readPayload(response);

    if (!response.ok) {
      throw new ApiError(
        getErrorMessage(payload, `A API retornou HTTP ${response.status}.`),
        response.status,
        url,
        payload,
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('A chamada para a API expirou ou foi cancelada.', 408, url);
    }
    throw new ApiError('Não foi possível conectar à API de chamados.', 0, url, error);
  } finally {
    options.signal?.removeEventListener('abort', abort);
    window.clearTimeout(timeoutId);
  }
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) => request<T>(path, { ...options, method: 'DELETE', body }),
};
