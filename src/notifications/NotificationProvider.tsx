import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { request } from '../api/http';
import { apiConfig } from '../api/config';
import type { NotificationItem, NotificationPage } from './types';

type NotificationContextValue = {
  items: NotificationItem[]; unread: number; connected: boolean; loading: boolean; error: string | null;
  hasMore: boolean; refresh: () => Promise<void>; loadMore: () => Promise<void>;
  read: (id: number) => Promise<boolean>; readAll: () => Promise<boolean>; archive: (id: number) => Promise<boolean>;
};

const Context = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children, identityKey }: { children: ReactNode; identityKey: string | null }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const identity = useRef(identityKey);

  identity.current = identityKey;
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);

  const load = useCallback(async (next?: number) => {
    if (!identityKey || identity.current !== identityKey) return;
    pending.current?.abort();
    const controller = new AbortController();

    pending.current = controller;
    const current = ++generation.current;

    setLoading(true);
    try {
      const page = await request<NotificationPage>('/api/notificacoes', {
        query: { usuarioId: identityKey, limite: 50, cursor: next }, signal: controller.signal,
      });

      if (controller.signal.aborted || identity.current !== identityKey || current !== generation.current) return;
      setItems(old => next ? [...old, ...page.itens.filter(n => !old.some(o => o.id === n.id))] : page.itens);
      setUnread(page.naoLidas); setCursor(page.proximoCursor); setError(null);
    } catch (cause) {
      if (!controller.signal.aborted && identity.current === identityKey) setError(cause instanceof Error ? cause.message : 'Falha ao carregar notificações.');
    } finally {
      if (identity.current === identityKey && current === generation.current) setLoading(false);
    }
  }, [identityKey]);
  const refresh = useCallback(() => load(), [load]);
  const loadMore = useCallback(async () => { if (cursor !== null && !loading) await load(cursor); }, [cursor, loading, load]);

  useEffect(() => {
    generation.current++;
    setItems([]); setUnread(0); setCursor(null); setConnected(false); setError(null); setLoading(false);
    if (!identityKey) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connection = new HubConnectionBuilder()
      .withUrl(`${apiConfig.baseUrl}/api/hubs/notificacoes?usuarioId=${encodeURIComponent(identityKey)}`)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]).configureLogging(LogLevel.Error).build();
    const sync = () => { if (!stopped) void refresh(); };
    const schedule = () => {
      if (stopped || retry) return;
      setConnected(false);
      retry = setTimeout(() => { retry = undefined; void start(); }, 5000);
    };

    async function start() {
      try {
        await connection.start();
        if (stopped) { await connection.stop();

 return; }

        setConnected(true); sync();
      } catch { schedule(); }
    }

    connection.on('NotificationsChanged', sync);
    connection.onreconnecting(() => { if (!stopped) setConnected(false); });
    connection.onreconnected(() => { if (!stopped) { setConnected(true); sync(); } });
    connection.onclose(schedule);
    sync(); void start();
    const poll = setInterval(sync, 30000);

    window.addEventListener('focus', sync);

    return () => {
      stopped = true; generation.current++; pending.current?.abort();
      clearTimeout(retry); clearInterval(poll); window.removeEventListener('focus', sync);
      void connection.stop().catch(() => {});
    };
  }, [identityKey, refresh]);

  const mutate = useCallback(async (path: string) => {
    if (!identityKey || identity.current !== identityKey) return false;
    try {
      await request<void>(`/api/notificacoes${path}`, { method: 'PATCH', query: { usuarioId: identityKey } });
      if (identity.current !== identityKey) return false;
      await refresh();

 return true;
    } catch (cause) {
      if (identity.current === identityKey) setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar a notificação.');

      return false;
    }
  }, [identityKey, refresh]);
  const read = useCallback((id: number) => mutate(`/${id}/ler`), [mutate]);
  const readAll = useCallback(() => mutate('/ler-todas'), [mutate]);
  const archive = useCallback((id: number) => mutate(`/${id}/arquivar`), [mutate]);
  const value = useMemo(() => ({ items, unread, connected, loading, error, hasMore: cursor !== null, refresh, loadMore, read, readAll, archive }),
    [items, unread, connected, loading, error, cursor, refresh, loadMore, read, readAll, archive]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useNotifications() {
  const value = useContext(Context);

  if (!value) throw new Error('NotificationProvider não encontrado.');

  return value;
}
