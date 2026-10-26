import { Component, type ErrorInfo, type ReactNode } from "react";
import { create } from "zustand";
import { recordDevEvent } from "./devTimeline";

export interface MonitoredError {
  id: string;
  signature: string;
  type: string;
  message: string;
  stack?: string;
  route: string;
  firstAt: number;
  lastAt: number;
  count: number;
  known: boolean;
  silencedUntil?: number;
  issue?: string;
}
interface ErrorStore {
  errors: MonitoredError[];
  capture: (error: Error, type?: string) => void;
  markKnown: (id: string) => void;
  silence: (id: string, minutes: number) => void;
  associate: (id: string, issue: string) => void;
  clear: () => void;
}
export const useDevErrors = create<ErrorStore>((set) => ({
  errors: [],
  capture: (error, type = "JavaScript") =>
    set((state) => {
      const signature = `${type}:${error.name}:${error.message}:${error.stack?.split("\n")[1] ?? ""}`;
      const found = state.errors.find((x) => x.signature === signature);
      recordDevEvent({ kind: "error", title: error.message, detail: type });
      return {
        errors: found
          ? state.errors.map((x) =>
              x.id === found.id
                ? { ...x, count: x.count + 1, lastAt: Date.now() }
                : x,
            )
          : [
              {
                id: crypto.randomUUID(),
                signature,
                type,
                message: error.message,
                stack: error.stack,
                route: location.pathname,
                firstAt: Date.now(),
                lastAt: Date.now(),
                count: 1,
                known: false,
              },
              ...state.errors,
            ],
      };
    }),
  markKnown: (id) =>
    set((s) => ({
      errors: s.errors.map((x) =>
        x.id === id ? { ...x, known: !x.known } : x,
      ),
    })),
  silence: (id, minutes) =>
    set((s) => ({
      errors: s.errors.map((x) =>
        x.id === id
          ? { ...x, silencedUntil: Date.now() + minutes * 60_000 }
          : x,
      ),
    })),
  associate: (id, issue) =>
    set((s) => ({
      errors: s.errors.map((x) => (x.id === id ? { ...x, issue } : x)),
    })),
  clear: () => set({ errors: [] }),
}));

export function setupDevErrorMonitor() {
  window.addEventListener("error", (e) =>
    useDevErrors
      .getState()
      .capture(
        e.error instanceof Error ? e.error : new Error(e.message),
        "JavaScript",
      ),
  );
  window.addEventListener("unhandledrejection", (e) =>
    useDevErrors
      .getState()
      .capture(
        e.reason instanceof Error ? e.reason : new Error(String(e.reason)),
        "Promise",
      ),
  );
}

export class DevErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    useDevErrors
      .getState()
      .capture(new Error(`${error.message}\n${info.componentStack}`), "React");
  }
  render() {
    return this.state.failed ? (
      <div role="alert" className="alert error">
        Erro React capturado pelo Monitor DEV. Recarregue a página para
        continuar.
      </div>
    ) : (
      this.props.children
    );
  }
}



