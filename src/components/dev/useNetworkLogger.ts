// store/useNetworkLogger.ts
import { create } from "zustand";
type ChamadoExistenteResumo = Record<string, unknown>;

export type FailureTicketState =
  | "unchecked"
  | "checking"
  | "available"
  | "existing"
  | "check-failed";

export interface NetworkLog {
  id: string;
  method: string;
  url: string;
  status?: number;
  payload?: unknown;
  bodyPayload?: unknown;
  headers?: Record<string, string>;
  response?: unknown;
  startTime: number;
  duration?: number;
  endTime?: number;
  responseHeaders?: Record<string, string>;
  requestSize?: number;
  responseSize?: number;
  cancelled?: boolean;
  timeout?: boolean;
  duplicate?: boolean;
  origin?: string;
  authType?: string;
  actionId?: string;
  traceId?: string;
  /** Requisição iniciada manualmente no simulador; nunca abre chamado automático. */
  suppressAutomaticTicket?: boolean;
  page: string;
  navigationId: string;
}

export interface NavigationGroup {
  id: string;
  path: string;
  label: string;
  timestamp: number;
}

interface NetworkStore {
  logs: NetworkLog[];
  navigations: NavigationGroup[];
  currentNavigationId: string;
  latestFailure: NetworkLog | null;
  failureSequence: number;
  latestFailureTicketState: FailureTicketState;
  latestFailureExistingTicket: ChamadoExistenteResumo | null;
  addLog: (log: NetworkLog) => void;
  updateLog: (id: string, data: Partial<NetworkLog>) => void;
  clearLogs: () => void;
  setFailureTicketState: (
    failureId: string,
    state: FailureTicketState,
    existingTicket?: ChamadoExistenteResumo | null,
  ) => void;
  notifyNavigation: (path: string) => void;
}

function newNavId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString();
}

function isTicketDiagnosticRequest(url: string) {
  try {
    const path = new URL(
      url,
      typeof window !== "undefined" ? window.location.origin : "http://localhost",
    ).pathname;
    return (
      /\/api\/qa\/chamados\/mapeamento-paginas\/?$/i.test(path) ||
      /\/api\/qa\/chamados\/mapeamento-paginas\/itens\/\d+\/disponibilidade\/?$/i.test(
        path,
      )
    );
  } catch {
    return false;
  }
}

export const useNetworkLogger = create<NetworkStore>((set) => ({
  logs: [],
  navigations: [],
  currentNavigationId: "initial",
  latestFailure: null,
  failureSequence: 0,
  latestFailureTicketState: "unchecked",
  latestFailureExistingTicket: null,

  addLog: (log) =>
    set((state) => {
      const navExists = state.navigations.some(
        (n) => n.id === log.navigationId,
      );
      const newNavigations = navExists
        ? state.navigations
        : [
            ...state.navigations,
            {
              id: log.navigationId,
              path: log.page,
              label: log.page,
              timestamp: log.startTime,
            },
          ];
      return { logs: [log, ...state.logs].slice(0, 500), navigations: newNavigations.slice(-100) };
    }),

  updateLog: (id, data) =>
    set((state) => {
      let failure: NetworkLog | null = null;
      const logs = state.logs.map((log) => {
        if (log.id !== id) return log;
        const updated = { ...log, ...data };
        const becameFailure =
          log.status === undefined &&
          updated.status !== undefined &&
          (updated.status === 0 || updated.status >= 400) &&
          !log.suppressAutomaticTicket &&
          !isTicketDiagnosticRequest(log.url);
        if (becameFailure) failure = updated;
        return updated;
      });

      return {
        logs,
        latestFailure: failure ?? state.latestFailure,
        failureSequence: failure
          ? state.failureSequence + 1
          : state.failureSequence,
        latestFailureTicketState: failure
          ? "unchecked"
          : state.latestFailureTicketState,
        latestFailureExistingTicket: failure
          ? null
          : state.latestFailureExistingTicket,
      };
    }),

  setFailureTicketState: (failureId, ticketState, existingTicket = null) =>
    set((state) =>
      state.latestFailure?.id === failureId
        ? {
            latestFailureTicketState: ticketState,
            latestFailureExistingTicket: existingTicket,
          }
        : state,
    ),

  clearLogs: () => {
    const navId = newNavId();
    const path = typeof window !== "undefined" ? window.location.pathname : "/";
    set({
      logs: [],
      navigations: [{ id: navId, path, label: path, timestamp: Date.now() }],
      currentNavigationId: navId,
      latestFailure: null,
      latestFailureTicketState: "unchecked",
      latestFailureExistingTicket: null,
    });
  },

  notifyNavigation: (path: string) => {
    set((state) => {
      const current = state.navigations.find(
        (navigation) => navigation.id === state.currentNavigationId,
      );
      if (current?.path === path) return state;
      const navId = newNavId();
      return {
        currentNavigationId: navId,
        navigations: [
          ...state.navigations,
          { id: navId, path, label: path, timestamp: Date.now() },
        ],
      };
    });
  },
}));


