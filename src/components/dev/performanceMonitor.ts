import { create } from "zustand";
import { useNetworkLogger } from "./useNetworkLogger";

export interface RuntimePerformanceSample {
  timestamp: number;
  label: string;
  latency: number;
  cpu: number;
  memory: number | null;
  fps: number;
  longTasks: number;
}

interface PerformanceMonitorState {
  samples: RuntimePerformanceSample[];
  current: RuntimePerformanceSample | null;
  addSample: (sample: RuntimePerformanceSample) => void;
}

export const usePerformanceMonitor = create<PerformanceMonitorState>((set) => ({
  samples: [],
  current: null,
  addSample: (sample) => set(state => ({
    current: sample,
    samples: [...state.samples, sample].slice(-36),
  })),
}));

let performanceMonitorStarted = false;

type PerformanceWithMemory = Performance & {
  memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
};

export function setupPerformanceMonitor() {
  if (performanceMonitorStarted || typeof window === "undefined") return;
  performanceMonitorStarted = true;

  let frameCount = 0;
  let longTaskCount = 0;
  let longTaskDuration = 0;
  let sampleStartedAt = performance.now();
  let frameId = 0;

  const countFrame = () => {
    frameCount += 1;
    frameId = requestAnimationFrame(countFrame);
  };
  frameId = requestAnimationFrame(countFrame);

  let observer: PerformanceObserver | null = null;
  if (typeof PerformanceObserver !== "undefined" && PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        longTaskCount += 1;
        longTaskDuration += entry.duration;
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  }

  const sample = () => {
    const now = performance.now();
    const elapsed = Math.max(now - sampleStartedAt, 1);
    const fps = Math.min(60, Math.round((frameCount * 1000) / elapsed));
    const droppedFrameLoad = Math.max(0, (60 - fps) / 60) * 100;
    const busyLoad = (longTaskDuration / elapsed) * 100;
    const cpu = Math.round(Math.min(100, Math.max(busyLoad, droppedFrameLoad)));
    const recentLogs = useNetworkLogger.getState().logs.filter(log =>
      log.duration !== undefined && log.startTime >= Date.now() - elapsed,
    );
    const latency = recentLogs.length
      ? Math.round(recentLogs.reduce((total, log) => total + (log.duration ?? 0), 0) / recentLogs.length)
      : 0;
    const memoryInfo = (performance as PerformanceWithMemory).memory;
    const memory = memoryInfo ? Math.round((memoryInfo.usedJSHeapSize / 1024 / 1024) * 10) / 10 : null;
    const timestamp = Date.now();
    usePerformanceMonitor.getState().addSample({
      timestamp,
      label: new Date(timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      latency,
      cpu,
      memory,
      fps,
      longTasks: longTaskCount,
    });
    frameCount = 0;
    longTaskCount = 0;
    longTaskDuration = 0;
    sampleStartedAt = now;
  };

  window.setTimeout(sample, 1000);
  const intervalId = window.setInterval(sample, 5000);
  window.addEventListener("beforeunload", () => {
    window.clearInterval(intervalId);
    cancelAnimationFrame(frameId);
    observer?.disconnect();
  }, { once: true });
}


