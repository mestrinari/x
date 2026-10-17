const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export const apiConfig = Object.freeze({
  baseUrl: normalizeBaseUrl(configuredBaseUrl),
  timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15000,
  credentials: 'same-origin' as RequestCredentials,
});

export type ApiConfig = typeof apiConfig;
