import { create } from "zustand";

export type SimulationMode =
  | "normal"
  | "offline"
  | "intermittent"
  | "timeout"
  | "empty"
  | "invalid-json"
  | "incomplete"
  | "large"
  | "pagination"
  | "duplicates"
  | "shuffle"
  | "nulls"
  | "status";
export interface NetworkSimulationRule {
  id: string;
  name: string;
  route: string;
  mode: SimulationMode;
  status?: number;
  latency: number;
  probability: number;
  enabled: boolean;
}
interface SimulationStore {
  enabled: boolean;
  globalLatency: number;
  rules: NetworkSimulationRule[];
  setEnabled: (enabled: boolean) => void;
  setGlobalLatency: (latency: number) => void;
  saveRule: (rule: NetworkSimulationRule) => void;
  removeRule: (id: string) => void;
  importRules: (rules: NetworkSimulationRule[]) => void;
}
const KEY = "qa-network-scenarios";
const initial = (() => {
  try {
    return JSON.parse(
      localStorage.getItem(KEY) ?? "[]",
    ) as NetworkSimulationRule[];
  } catch {
    return [];
  }
})();
export const useNetworkSimulator = create<SimulationStore>((set) => ({
  enabled: false,
  globalLatency: 0,
  rules: initial,
  setEnabled: (enabled) => set({ enabled }),
  setGlobalLatency: (globalLatency) => set({ globalLatency }),
  saveRule: (rule) =>
    set((state) => {
      const rules = [...state.rules.filter((x) => x.id !== rule.id), rule];
      localStorage.setItem(KEY, JSON.stringify(rules));
      return { rules };
    }),
  removeRule: (id) =>
    set((state) => {
      const rules = state.rules.filter((x) => x.id !== id);
      localStorage.setItem(KEY, JSON.stringify(rules));
      return { rules };
    }),
  importRules: (rules) => {
    localStorage.setItem(KEY, JSON.stringify(rules));
    set({ rules });
  },
}));

const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));
export async function simulateNetwork(url: string): Promise<Response | null> {
  const state = useNetworkSimulator.getState();
  if (!state.enabled) return null;
  const rule = [...state.rules]
    .reverse()
    .find((x) => x.enabled && (url.includes(x.route) || x.route === "*"));
  const latency = rule?.latency ?? state.globalLatency;
  if (latency > 0) await wait(latency);
  if (!rule || Math.random() * 100 > rule.probability) return null;
  if (rule.mode === "offline" || rule.mode === "intermittent")
    throw new TypeError("Simulação DEV: conexão indisponível");
  if (rule.mode === "timeout") {
    await wait(30_000);
    throw new DOMException("Simulação DEV: timeout", "TimeoutError");
  }
  const headers = {
    "Content-Type": "application/json",
    "X-QA-Simulation": rule.name,
  };
  if (rule.mode === "status")
    return new Response(
      JSON.stringify({ simulated: true, status: rule.status }),
      { status: rule.status ?? 500, headers },
    );
  if (rule.mode === "empty") return new Response("", { status: 204, headers });
  if (rule.mode === "invalid-json")
    return new Response("{ json: inválido,", { status: 200, headers });
  if (rule.mode === "large")
    return new Response(
      JSON.stringify({
        items: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          description: "x".repeat(100),
        })),
      }),
      { status: 200, headers },
    );
  if (rule.mode === "incomplete")
    return new Response(JSON.stringify({ id: 1 }), { status: 200, headers });
  if (rule.mode === "pagination")
    return new Response(
      JSON.stringify({ pagina: 5, totalPaginas: 2, items: [] }),
      { status: 200, headers },
    );
  if (rule.mode === "duplicates")
    return new Response(JSON.stringify({ items: [{ id: 1 }, { id: 1 }] }), {
      status: 200,
      headers,
    });
  if (rule.mode === "shuffle")
    return new Response(
      JSON.stringify({ items: [{ id: 3 }, { id: 1 }, { id: 2 }] }),
      { status: 200, headers },
    );
  if (rule.mode === "nulls")
    return new Response(
      JSON.stringify({ id: null, nome: null, items: [null] }),
      { status: 200, headers },
    );
  return null;
}



