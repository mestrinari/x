import { sanitizeNetworkValue } from "./networkEvidence";
import { useNetworkLogger } from "./useNetworkLogger";
import { recordDevEvent } from "./devTimeline";
import { simulateNetwork } from "./networkSimulator";

declare global {
  interface RequestInit {
    /** Metadado local consumido pelo interceptor; não é enviado pela rede. */
    qaSuppressAutomaticTicket?: boolean;
  }
  interface Window {
    __fetchInterceptorInstalled?: boolean;
    __originalFetch?: typeof fetch;
  }
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
]);

interface PendingReplayApplication {
  method: string;
  originalUrl: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  expiresAt: number;
  remainingUses: number;
}

let pendingReplayApplication: PendingReplayApplication | null = null;
let currentApplicationRoute: string | null = null;

export function setNetworkLoggerRoute(path: string) {
  currentApplicationRoute = path;
}

function normalizedUrl(url: string) {
  try { return new URL(url, window.location.origin).href; }
  catch { return url; }
}

export function stageNetworkReplayApplication(input: Omit<PendingReplayApplication, "originalUrl" | "method" | "expiresAt" | "remainingUses"> & { originalUrl: string; method: string }) {
  pendingReplayApplication = {
    ...input,
    originalUrl: normalizedUrl(input.originalUrl),
    method: input.method.toUpperCase(),
    expiresAt: Date.now() + 3_000,
    remainingUses: 1,
  };
}

function consumeNetworkReplayApplication(method: string, url: string) {
  const pending = pendingReplayApplication;
  if (!pending) return null;
  if (pending.expiresAt < Date.now()) {
    pendingReplayApplication = null;
    return null;
  }
  if (pending.method !== method || pending.originalUrl !== normalizedUrl(url)) return null;
  pending.remainingUses -= 1;
  if (pending.remainingUses <= 0) pendingReplayApplication = null;
  return new Response(pending.body || null, {
    status: pending.status,
    statusText: pending.statusText,
    headers: pending.headers,
  });
}

function safeHeaders(resource: RequestInfo | URL, config?: RequestInit) {
  const headers = new Headers(
    resource instanceof Request ? resource.headers : undefined,
  );
  new Headers(config?.headers).forEach((value, key) => headers.set(key, value));
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? "[REDACTED]"
      : value;
  });
  return result;
}

function bodyPreview(body: BodyInit | null | undefined): unknown {
  if (!body) return undefined;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
  if (body instanceof URLSearchParams)
    return Object.fromEntries(body.entries());
  if (body instanceof FormData) {
    return Object.fromEntries(
      [...body.entries()].map(([key, value]) => [
        key,
        value instanceof File
          ? { name: value.name, type: value.type, size: value.size }
          : value,
      ]),
    );
  }
  if (body instanceof Blob) return { type: body.type, size: body.size };
  return `[${body.constructor?.name ?? "Request body"}]`;
}

function queryPreview(url: string): Record<string, string | string[]> {
  try {
    const params = new URL(url, window.location.origin).searchParams;
    const result: Record<string, string | string[]> = {};

    for (const key of new Set(params.keys())) {
      const values = params.getAll(key);
      result[key] = values.length > 1 ? values : values[0];
    }

    return result;
  } catch {
    return {};
  }
}

function requestPayload(
  url: string,
  body: BodyInit | null | undefined,
): unknown {
  const bodyValue = bodyPreview(body);
  const query = queryPreview(url);
  const hasQuery = Object.keys(query).length > 0;

  if (bodyValue !== undefined && hasQuery) return { query, body: bodyValue };
  if (bodyValue !== undefined) return bodyValue;
  if (hasQuery) return query;
  return {};
}

function parseResponse(text: string): unknown {
  if (!text) return null;
  if (text.length > 2_000_000)
    return `${text.slice(0, 2_000_000)}… [resposta truncada]`;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function responseHeaders(headers: Headers) {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = SENSITIVE_HEADERS.has(key.toLowerCase())
      ? "[REDACTED]"
      : value;
  });
  return result;
}

async function readResponsePreview(response: Response): Promise<string> {
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("event-stream") || (type && !/json|text|xml|javascript|urlencoded/i.test(type))) {
    void response.body?.cancel().catch(() => {});
    return "[Conteúdo binário ou streaming: prévia omitida]";
  }
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "", size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      const remaining = 256_000 - size;
      text += decoder.decode(chunk.value.subarray(0, remaining), { stream: true });
      size += chunk.value.length;
      if (size >= 256_000) { void reader.cancel().catch(() => {}); return text + "… [prévia limitada a 256 KB]"; }
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}

export function setupFetchInterceptor() {
  if (typeof window === "undefined" || window.__fetchInterceptorInstalled)
    return;
  window.__fetchInterceptorInstalled = true;
  window.__originalFetch ??= window.fetch.bind(window);
  const originalFetch = window.__originalFetch;

  window.fetch = async (resource, config) => {
    const request = resource instanceof Request ? resource : null;
    const url = request?.url ?? String(resource);
    const method = (config?.method ?? request?.method ?? "GET").toUpperCase();
    const appliedReplay = consumeNetworkReplayApplication(method, url);
    if (appliedReplay) return appliedReplay;
    const logId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const startTime = Date.now();
    let store = useNetworkLogger.getState();
    let currentNavigation = store.navigations.find(
      (navigation) => navigation.id === store.currentNavigationId,
    );
    if (currentApplicationRoute && currentNavigation?.path !== currentApplicationRoute) {
      store.notifyNavigation(currentApplicationRoute);
      store = useNetworkLogger.getState();
      currentNavigation = store.navigations.find(
        (navigation) => navigation.id === store.currentNavigationId,
      );
    }
    let bodyPayload = bodyPreview(config?.body);
    let payload = requestPayload(url, config?.body);
    if (
      config?.body === undefined &&
      request &&
      !["GET", "HEAD"].includes(method)
    ) {
      try {
        const requestBody = await request.clone().text();
        bodyPayload = bodyPreview(requestBody);
        payload = requestPayload(url, requestBody);
      } catch {
        // Mantém query ou objeto vazio quando o corpo do Request não puder ser clonado.
      }
    }

    store.addLog({
      id: logId,
      method,
      url,
      payload: sanitizeNetworkValue(payload),
      bodyPayload: sanitizeNetworkValue(bodyPayload),
      headers: safeHeaders(resource, config),
      page: currentNavigation?.path ?? window.location.pathname,
      navigationId: store.currentNavigationId,
      startTime,
      requestSize: new Blob([JSON.stringify(payload)]).size,
      duplicate: store.logs.some(
        (log) =>
          log.method === method &&
          log.url === url &&
          Date.now() - log.startTime < 1000,
      ),
      origin: currentNavigation?.path ?? window.location.pathname,
      authType: safeHeaders(resource, config).authorization
        ? "Bearer (oculto)"
        : "sessão/cookie ou anônima",
      suppressAutomaticTicket: config?.qaSuppressAutomaticTicket === true,
    });
    recordDevEvent({
      kind: "http",
      title: `${method} ${new URL(url, window.location.origin).pathname}`,
      detail: "requisição iniciada",
      actionId: logId,
    });

    try {
      const response =
        (await simulateNetwork(url)) ?? (await originalFetch(resource, config));
      {
        useNetworkLogger.getState().updateLog(logId, {
          status: response.status,
          duration: Date.now() - startTime,
          endTime: Date.now(),
          responseHeaders: responseHeaders(response.headers),
        });
      }
      void readResponsePreview(response.clone())
        .then((text) =>
          useNetworkLogger.getState().updateLog(logId, {
            status: response.status,
            response: sanitizeNetworkValue(parseResponse(text)),
            duration: Date.now() - startTime,
            endTime: Date.now(),
            responseSize: new Blob([text]).size,
            responseHeaders: responseHeaders(response.headers),
            traceId:
              response.headers.get("trace-id") ??
              response.headers.get("x-trace-id") ??
              undefined,
          }),
        )
        .catch(() =>
          useNetworkLogger.getState().updateLog(logId, {
            status: response.status,
            response: "[Resposta binária ou indisponível]",
            duration: Date.now() - startTime,
            endTime: Date.now(),
            responseHeaders: responseHeaders(response.headers),
          }),
        );
      recordDevEvent({
        kind: "http",
        title: `${method} ${new URL(url, window.location.origin).pathname}`,
        detail: `${response.status} em ${Date.now() - startTime}ms`,
        actionId: logId,
        traceId: response.headers.get("trace-id") ?? undefined,
      });
      return response;
    } catch (error) {
      useNetworkLogger.getState().updateLog(logId, {
        status: 0,
        response:
          error instanceof Error ? error.message : "Network Request Failed",
        duration: Date.now() - startTime,
        endTime: Date.now(),
        cancelled: error instanceof DOMException && error.name === "AbortError",
        timeout: error instanceof DOMException && error.name === "TimeoutError",
      });
      recordDevEvent({
        kind: "error",
        title: `${method} ${new URL(url, window.location.origin).pathname}`,
        detail: error instanceof Error ? error.message : "Falha de rede",
        actionId: logId,
      });
      throw error;
    }
  };
}

