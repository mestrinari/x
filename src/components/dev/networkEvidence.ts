import type { NetworkLog } from "./useNetworkLogger";

const SENSITIVE_KEY =
  /authorization|cookie|password|passwd|senha|secret|token|api[-_]?key|access[-_]?key|refresh[-_]?token|client[-_]?secret/i;

function sanitizeText(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(
      /((?:password|passwd|senha|secret|token|api[-_]?key)\s*[=:]\s*)[^\s&,;]+/gi,
      "$1[REDACTED]",
    );
}

export function sanitizeNetworkUrl(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    for (const key of url.searchParams.keys()) {
      if (SENSITIVE_KEY.test(key)) url.searchParams.set(key, "[REDACTED]");
    }
    return url.toString();
  } catch {
    return sanitizeText(value);
  }
}

export function sanitizeNetworkValue(
  value: unknown,
  seen = new WeakSet<object>(),
  depth = 0,
): unknown {
  if (typeof value === "string") return sanitizeText(value.length > 50_000 ? value.slice(0, 50_000) + "… [valor truncado]" : value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= 12) return "[Profundidade limitada]";

  seen.add(value);
  if (Array.isArray(value)) {
    return value
      .slice(0, 500)
      .map((item) => sanitizeNetworkValue(item, seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 500)
      .map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key)
          ? "[REDACTED]"
          : sanitizeNetworkValue(item, seen, depth + 1),
      ]),
  );
}

export function formatNetworkValue(value: unknown, emptyLabel: string): string {
  if (value === undefined) return emptyLabel;
  const sanitized = sanitizeNetworkValue(value);
  const text =
    typeof sanitized === "string"
      ? sanitized
      : JSON.stringify(sanitized, null, 2);
  return text.length > 50_000
    ? `${text.slice(0, 50_000)}\n… [conteúdo truncado em 50.000 caracteres]`
    : text;
}

export function buildSafeCurl(log: NetworkLog): string {
  const quote = (value: string) => value.replace(/'/g, "'\\''");
  const parts = [
    `curl -X ${log.method} '${quote(sanitizeNetworkUrl(log.url))}'`,
  ];

  Object.entries(log.headers ?? {}).forEach(([key, value]) => {
    const safeValue = SENSITIVE_KEY.test(key)
      ? "[REDACTED]"
      : sanitizeText(value);
    parts.push(`  -H '${quote(`${key}: ${safeValue}`)}'`);
  });

  if (log.bodyPayload !== undefined) {
    parts.push(`  -d '${quote(formatNetworkValue(log.bodyPayload, ""))}'`);
  }

  return parts.join(" \\\n");
}

export function networkRequestSummary(
  log: NetworkLog,
  endpointPath: string,
): string {
  const result = log.status === 0 ? "Falha de rede" : `HTTP ${log.status}`;
  const duration = log.duration === undefined ? "" : ` em ${log.duration}ms`;
  return `${log.method} ${endpointPath} → ${result}${duration} · tela ${log.page}`;
}

