import { create } from "zustand";

export type DevEventKind =
  | "click"
  | "change"
  | "navigation"
  | "modal"
  | "http"
  | "error"
  | "state"
  | "global"
  | "marker";

export interface DevTimelineEvent {
  id: string;
  sessionId: string;
  kind: DevEventKind;
  title: string;
  detail?: string;
  route: string;
  timestamp: number;
  actionId?: string;
  traceId?: string;
  data?: unknown;
}

interface DevTimelineStore {
  sessionId: string;
  events: DevTimelineEvent[];
  paused: boolean;
  add: (
    event: Omit<DevTimelineEvent, "id" | "sessionId" | "timestamp" | "route"> &
      Partial<Pick<DevTimelineEvent, "timestamp" | "route">>,
  ) => void;
  clear: () => void;
  setPaused: (paused: boolean) => void;
  importEvents: (events: DevTimelineEvent[]) => void;
}

const id = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
const sessionId = sessionStorage.getItem("qa-dev-session") ?? id();
sessionStorage.setItem("qa-dev-session", sessionId);

export const useDevTimeline = create<DevTimelineStore>((set, get) => ({
  sessionId,
  events: [],
  paused: false,
  add: (event) => {
    if (get().paused) return;
    set((state) => ({
      events: [
        {
          ...event,
          id: id(),
          sessionId: state.sessionId,
          timestamp: event.timestamp ?? Date.now(),
          route: event.route ?? window.location.pathname,
        },
        ...state.events,
      ].slice(0, 1500),
    }));
  },
  clear: () => set({ events: [] }),
  setPaused: (paused) => set({ paused }),
  importEvents: (events) =>
    set({ events: [...events, ...get().events].slice(0, 1500) }),
}));

export function recordDevEvent(event: Parameters<DevTimelineStore["add"]>[0]) {
  useDevTimeline.getState().add(event);
}

export function setupDevTimeline() {
  const describe = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return "elemento";
    return (
      target.getAttribute("aria-label") ||
      target.innerText?.trim().slice(0, 100) ||
      target.id ||
      target.tagName.toLowerCase()
    );
  };
  document.addEventListener(
    "click",
    (event) =>
      recordDevEvent({
        kind: "click",
        title: describe(event.target),
        detail:
          (event.target as HTMLElement | null)
            ?.closest("[data-dev-component]")
            ?.getAttribute("data-dev-component") ?? undefined,
      }),
    true,
  );
  document.addEventListener(
    "change",
    (event) =>
      recordDevEvent({
        kind: "change",
        title: describe(event.target),
        detail: "Valor alterado (conteúdo sensível omitido)",
      }),
    true,
  );
  window.addEventListener("error", (event) =>
    recordDevEvent({
      kind: "error",
      title: event.message,
      detail: `${event.filename}:${event.lineno}:${event.colno}`,
    }),
  );
  window.addEventListener("unhandledrejection", (event) =>
    recordDevEvent({
      kind: "error",
      title: "Promise rejeitada",
      detail:
        event.reason instanceof Error
          ? event.reason.message
          : String(event.reason),
    }),
  );
}



