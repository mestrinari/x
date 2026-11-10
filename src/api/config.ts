const LOCAL_STORAGE_KEY = 'orbit.api_url';

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

export function getCustomApiUrl(): string {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function setCustomApiUrl(url: string): void {
  try {
    const normalized = normalizeBaseUrl(url);
    if (!normalized) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
    }
  } catch {
    /* localStorage indisponível */
  }
}

function getInitialBaseUrl() {
  const custom = getCustomApiUrl();
  if (custom) return normalizeBaseUrl(custom);

  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
  return normalizeBaseUrl(envUrl);
}

const configuredTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

export const apiConfig = {
  get baseUrl() {
    const custom = getCustomApiUrl();
    if (custom) return normalizeBaseUrl(custom);
    return normalizeBaseUrl(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '');
  },
  timeoutMs: Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 15000,
  credentials: 'same-origin' as RequestCredentials,
};

export type ApiConfig = typeof apiConfig;
