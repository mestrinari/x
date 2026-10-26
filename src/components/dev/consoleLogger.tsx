/* eslint-disable react-refresh/only-export-components */
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export const CONSOLE_LEVELS = [
  "log",
  "info",
  "warn",
  "error",
  "debug",
  "table",
] as const;

export type ConsoleLevel = (typeof CONSOLE_LEVELS)[number];

export type ConsoleLogEntry = {
  id: string;
  level: ConsoleLevel;
  args: unknown[];
  timestamp: number;
  source: string | null;
  stack: string | null;
  searchText: string;
  signature: string;
  count: number;
  pinned: boolean;
};

type ConsoleSnapshot = {
  entries: ConsoleLogEntry[];
  paused: boolean;
  maxEntries: number;
};

type ConsoleMethod = (...args: unknown[]) => void;

type ConsoleRuntime = {
  snapshot: ConsoleSnapshot;
  listeners: Set<() => void>;
  originals: Partial<Record<ConsoleLevel, ConsoleMethod>>;
  wrappers: Partial<Record<ConsoleLevel, ConsoleMethod>>;
  originalClear: (() => void) | null;
  clearWrapper: (() => void) | null;
  installed: boolean;
  installCount: number;
  notificationScheduled: boolean;
};

const runtimeKey = Symbol.for("custom.console.debugger.runtime");

function createRuntime(): ConsoleRuntime {
  return {
    snapshot: {
      entries: [],
      paused: false,
      maxEntries: 500,
    },
    listeners: new Set(),
    originals: {},
    wrappers: {},
    originalClear: null,
    clearWrapper: null,
    installed: false,
    installCount: 0,
    notificationScheduled: false,
  };
}

function getRuntime(): ConsoleRuntime {
  const container = globalThis as unknown as Record<PropertyKey, unknown>;

  if (!container[runtimeKey]) {
    container[runtimeKey] = createRuntime();
  }

  return container[runtimeKey] as ConsoleRuntime;
}

function emitSnapshot(snapshot: ConsoleSnapshot): void {
  const runtime = getRuntime();
  runtime.snapshot = snapshot;
  if (runtime.notificationScheduled) return;
  runtime.notificationScheduled = true;
  const notify = () => {
    runtime.notificationScheduled = false;
    runtime.listeners.forEach((listener) => listener());
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(notify);
  else setTimeout(notify, 0);
}

function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractSource(stack?: string): string | null {
  if (!stack) return null;

  const ignoredPatterns = [
    "captureConsoleEntry",
    "wrappedConsoleMethod",
    "consoleLogger",
    "console.<computed>",
  ];

  const line = stack
    .split("\n")
    .map((item) => item.trim())
    .slice(2)
    .find(
      (item) =>
        item.length > 0 &&
        !ignoredPatterns.some((pattern) => item.includes(pattern)),
    );

  return line?.replace(/^at\s+/, "") ?? null;
}

export function serializeConsoleValue(
  value: unknown,
  seen = new WeakMap<object, string>(),
  path = "root",
  depth = 0,
): unknown {
  if (depth > 10) return "[Profundidade máxima]";
  if (value === null) return null;

  if (typeof value === "undefined") return "[undefined]";
  if (typeof value === "bigint") return `${value.toString()}n`;
  if (typeof value === "symbol") return value.toString();

  if (typeof value === "function") {
    return `[Function ${value.name || "anonymous"}]`;
  }

  if (typeof value !== "object") return value;

  if (seen.has(value)) {
    return `[Circular → ${seen.get(value)}]`;
  }

  seen.set(value, path);

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString();
  }

  if (value instanceof RegExp) {
    return value.toString();
  }

  if (value instanceof Error) {
    const error = value as Error & { cause?: unknown };

    return {
      $type: value.name,
      message: value.message,
      stack: value.stack,
      cause:
        error.cause === undefined
          ? undefined
          : serializeConsoleValue(
              error.cause,
              seen,
              `${path}.cause`,
              depth + 1,
            ),
    };
  }

  if (typeof URL !== "undefined" && value instanceof URL) {
    return value.toString();
  }

  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) {
    return {
      $type: "HTMLElement",
      tagName: value.tagName.toLowerCase(),
      id: value.id || null,
      className: value.className || null,
      textContent: value.textContent?.trim().slice(0, 500) || null,
      attributes: Object.fromEntries(
        Array.from(value.attributes).map((attribute) => [
          attribute.name,
          attribute.value,
        ]),
      ),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      serializeConsoleValue(item, seen, `${path}[${index}]`, depth + 1),
    );
  }

  if (value instanceof Map) {
    return {
      $type: "Map",
      size: value.size,
      entries: Array.from(value.entries()).map(([key, mapValue], index) => ({
        key: serializeConsoleValue(
          key,
          seen,
          `${path}.entries[${index}].key`,
          depth + 1,
        ),
        value: serializeConsoleValue(
          mapValue,
          seen,
          `${path}.entries[${index}].value`,
          depth + 1,
        ),
      })),
    };
  }

  if (value instanceof Set) {
    return {
      $type: "Set",
      size: value.size,
      values: Array.from(value.values()).map((item, index) =>
        serializeConsoleValue(
          item,
          seen,
          `${path}.values[${index}]`,
          depth + 1,
        ),
      ),
    };
  }

  const result: Record<string, unknown> = {};

  try {
    Reflect.ownKeys(value).forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor) return;

      const normalizedKey = typeof key === "symbol" ? key.toString() : key;

      if ("value" in descriptor) {
        result[normalizedKey] = serializeConsoleValue(
          descriptor.value,
          seen,
          `${path}.${normalizedKey}`,
          depth + 1,
        );
        return;
      }

      const accessors: string[] = [];

      if (descriptor.get) accessors.push("Getter");
      if (descriptor.set) accessors.push("Setter");

      result[normalizedKey] = `[${accessors.join("/")}]`;
    });
  } catch {
    return `[Objeto não inspecionável: ${value.constructor?.name ?? "Object"}]`;
  }

  return result;
}

export function consoleValueToText(value: unknown): string {
  try {
    const serialized = serializeConsoleValue(value);
    const text = JSON.stringify(serialized);

    return text ?? String(serialized);
  } catch {
    try {
      return String(value);
    } catch {
      return "[Valor não serializável]";
    }
  }
}

function buildSearchText(args: unknown[]): string {
  return args
    .map((argument) => consoleValueToText(argument))
    .join(" ")
    .slice(0, 20000);
}

function trimEntries(
  entries: ConsoleLogEntry[],
  maxEntries: number,
): ConsoleLogEntry[] {
  if (entries.length <= maxEntries) return entries;

  const result = [...entries];

  while (result.length > maxEntries) {
    const removableIndex = result.findIndex((entry) => !entry.pinned);

    if (removableIndex === -1) {
      break;
    }

    result.splice(removableIndex, 1);
  }

  return result;
}

function captureConsoleEntry(level: ConsoleLevel, args: unknown[]): void {
  const runtime = getRuntime();
  const snapshot = runtime.snapshot;

  if (snapshot.paused) return;

  const timestamp = Date.now();
  const stack = new Error().stack ?? null;
  const searchText = buildSearchText(args);
  const signature = `${level}:${searchText}`;
  const previousEntry = snapshot.entries[snapshot.entries.length - 1];

  if (
    previousEntry &&
    !previousEntry.pinned &&
    previousEntry.signature === signature &&
    timestamp - previousEntry.timestamp <= 2000
  ) {
    const entries = [
      ...snapshot.entries.slice(0, -1),
      {
        ...previousEntry,
        timestamp,
        count: previousEntry.count + 1,
      },
    ];

    emitSnapshot({
      ...snapshot,
      entries,
    });

    return;
  }

  const entry: ConsoleLogEntry = {
    id: createId(),
    level,
    args: [...args],
    timestamp,
    source: extractSource(stack ?? undefined),
    stack,
    searchText,
    signature,
    count: 1,
    pinned: false,
  };

  emitSnapshot({
    ...snapshot,
    entries: trimEntries([...snapshot.entries, entry], snapshot.maxEntries),
  });
}

export function installConsoleInterceptor(): () => void {
  const runtime = getRuntime();
  runtime.installCount += 1;

  if (!runtime.installed) {
    runtime.installed = true;

    const consoleRecord = console as unknown as Record<string, ConsoleMethod>;

    CONSOLE_LEVELS.forEach((level) => {
      const original = consoleRecord[level]?.bind(console);

      if (!original) return;

      const wrapper: ConsoleMethod = (...args) => {
        original(...args);
        captureConsoleEntry(level, args);
      };

      runtime.originals[level] = original;
      runtime.wrappers[level] = wrapper;
      consoleRecord[level] = wrapper;
    });

    runtime.originalClear = console.clear.bind(console);
    runtime.clearWrapper = () => {
      runtime.originalClear?.();
      clearAllConsoleEntries();
    };

    console.clear = runtime.clearWrapper;
  }

  return () => {
    const currentRuntime = getRuntime();
    currentRuntime.installCount = Math.max(0, currentRuntime.installCount - 1);

    if (currentRuntime.installCount > 0) return;

    const consoleRecord = console as unknown as Record<string, ConsoleMethod>;

    CONSOLE_LEVELS.forEach((level) => {
      const wrapper = currentRuntime.wrappers[level];
      const original = currentRuntime.originals[level];

      if (wrapper && original && consoleRecord[level] === wrapper) {
        consoleRecord[level] = original;
      }
    });

    if (
      currentRuntime.clearWrapper &&
      console.clear === currentRuntime.clearWrapper &&
      currentRuntime.originalClear
    ) {
      console.clear = currentRuntime.originalClear;
    }

    currentRuntime.installed = false;
    currentRuntime.originals = {};
    currentRuntime.wrappers = {};
    currentRuntime.originalClear = null;
    currentRuntime.clearWrapper = null;
  };
}

export function setConsoleCapturePaused(paused: boolean): void {
  const runtime = getRuntime();

  emitSnapshot({
    ...runtime.snapshot,
    paused,
  });
}

export function clearUnpinnedConsoleEntries(): void {
  const runtime = getRuntime();

  emitSnapshot({
    ...runtime.snapshot,
    entries: runtime.snapshot.entries.filter((entry) => entry.pinned),
  });
}

export function clearAllConsoleEntries(): void {
  const runtime = getRuntime();

  emitSnapshot({
    ...runtime.snapshot,
    entries: [],
  });
}

export function removeConsoleEntry(id: string): void {
  const runtime = getRuntime();

  emitSnapshot({
    ...runtime.snapshot,
    entries: runtime.snapshot.entries.filter((entry) => entry.id !== id),
  });
}

export function toggleConsoleEntryPinned(id: string): void {
  const runtime = getRuntime();

  emitSnapshot({
    ...runtime.snapshot,
    entries: runtime.snapshot.entries.map((entry) =>
      entry.id === id
        ? {
            ...entry,
            pinned: !entry.pinned,
          }
        : entry,
    ),
  });
}

export function setConsoleMaxEntries(maxEntries: number): void {
  const runtime = getRuntime();
  const normalizedLimit = Math.max(50, Math.min(5000, maxEntries));

  emitSnapshot({
    ...runtime.snapshot,
    maxEntries: normalizedLimit,
    entries: trimEntries(runtime.snapshot.entries, normalizedLimit),
  });
}

function subscribe(listener: () => void): () => void {
  const runtime = getRuntime();
  runtime.listeners.add(listener);

  return () => {
    runtime.listeners.delete(listener);
  };
}

function getSnapshot(): ConsoleSnapshot {
  return getRuntime().snapshot;
}

export function useConsoleLogger() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    ...snapshot,
    setPaused: setConsoleCapturePaused,
    clearUnpinned: clearUnpinnedConsoleEntries,
    clearAll: clearAllConsoleEntries,
    removeEntry: removeConsoleEntry,
    togglePinned: toggleConsoleEntryPinned,
    setMaxEntries: setConsoleMaxEntries,
  };
}

export function ConsoleLoggerProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    return installConsoleInterceptor();
  }, [enabled]);

  return children;
}

