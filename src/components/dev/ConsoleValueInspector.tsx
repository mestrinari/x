import { useMemo, useState } from "react";
import { consoleValueToText, serializeConsoleValue } from "./consoleLogger";

type ChildValue = { key: string; value: unknown };

function typeName(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (value instanceof Error) return "error";
  if (value instanceof Date) return "date";
  if (value instanceof Map) return "map";
  if (value instanceof Set) return "set";
  return typeof value;
}

function primitiveText(value: unknown) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "bigint") return `${value}n`;
  if (typeof value === "symbol") return value.toString();
  if (typeof value === "function") return `ƒ ${value.name || "anonymous"}(${Array.from({ length: value.length }, (_, index) => `arg${index + 1}`).join(", ")})`;
  return String(value);
}

function valueColor(value: unknown) {
  if (value === null || value === undefined) return "text-muted-foreground";
  if (typeof value === "string") return "text-emerald-300";
  if (typeof value === "number" || typeof value === "bigint") return "text-amber-300";
  if (typeof value === "boolean") return value ? "text-blue-300" : "text-red-300";
  if (typeof value === "function") return "text-violet-300";
  if (typeof value === "symbol") return "text-orange-300";
  return "text-foreground";
}

function objectSummary(value: object) {
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (value instanceof Map) return `Map(${value.size})`;
  if (value instanceof Set) return `Set(${value.size})`;
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "Invalid Date" : `Date("${value.toISOString()}")`;
  if (value instanceof RegExp) return value.toString();
  if (typeof URL !== "undefined" && value instanceof URL) return `URL("${value.toString()}")`;
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return `<${value.tagName.toLowerCase()}${value.id ? `#${value.id}` : ""}>`;
  try { return `${value.constructor?.name || "Object"} {${Reflect.ownKeys(value).length}}`; }
  catch { return value.constructor?.name || "Object"; }
}

function ownProperties(value: object): ChildValue[] {
  try {
    return Reflect.ownKeys(value).slice(0, 250).map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      const normalizedKey = typeof key === "symbol" ? key.toString() : key;
      if (!descriptor) return { key: normalizedKey, value: "[Indisponível]" };
      if ("value" in descriptor) return { key: normalizedKey, value: descriptor.value };
      return { key: normalizedKey, value: `[${[descriptor.get && "Getter", descriptor.set && "Setter"].filter(Boolean).join("/")}]` };
    });
  } catch { return [{ key: "erro", value: "[Não foi possível listar as propriedades]" }]; }
}

function childValues(value: object): ChildValue[] {
  if (Array.isArray(value)) return value.slice(0, 250).map((item, index) => ({ key: String(index), value: item }));
  if (value instanceof Map) return Array.from(value.entries()).slice(0, 125).flatMap(([key, item], index) => [{ key: `${index}.key`, value: key }, { key: `${index}.value`, value: item }]);
  if (value instanceof Set) return Array.from(value.values()).slice(0, 250).map((item, index) => ({ key: String(index), value: item }));
  if (value instanceof Error) return [{ key: "name", value: value.name }, { key: "message", value: value.message }, { key: "stack", value: value.stack }, { key: "cause", value: (value as Error & { cause?: unknown }).cause }, ...ownProperties(value)];
  return ownProperties(value);
}

function FunctionSource({ value }: { value: Function }) {
  const source = (() => { try { return Function.prototype.toString.call(value); } catch { return "[Código-fonte indisponível]"; } })();
  const tokens = source.split(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\.|[^`])*`|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\b(?:async|await|function|return|const|let|var|if|else|for|while|switch|case|new|throw|try|catch|finally|class|extends|this|typeof|instanceof|in|of|yield)\b|\b\d+(?:\.\d+)?\b)/g);
  return <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded border border-border bg-muted/50 p-3 text-[11px] leading-5 text-foreground select-text">{tokens.map((token, index) => {
    const className = /^\/[/*]/.test(token) ? "text-muted-foreground" : /^[`"']/.test(token) ? "text-emerald-300" : /^\d/.test(token) ? "text-amber-300" : /^(async|await|function|return|const|let|var|if|else|for|while|switch|case|new|throw|try|catch|finally|class|extends|this|typeof|instanceof|in|of|yield)$/.test(token) ? "text-violet-300" : "text-foreground";
    return <span key={index} className={className}>{token}</span>;
  })}</pre>;
}

export function isComplexConsoleValue(value: unknown) {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

export function ConsoleValueInspector({ value, name, depth = 0, ancestors = [] }: { value: unknown; name?: string; depth?: number; ancestors?: object[] }) {
  const objectValue = typeof value === "object" && value !== null ? value : null;
  const functionValue = typeof value === "function" ? value : null;
  const circular = objectValue !== null && ancestors.includes(objectValue);
  const children = useMemo(() => objectValue && !circular ? childValues(objectValue) : [], [circular, objectValue]);
  const expandable = children.length > 0 || functionValue !== null;
  const [open, setOpen] = useState(depth < 2 && expandable);
  const display = circular ? "[Circular]" : objectValue ? objectSummary(objectValue) : primitiveText(value);
  const serialized = serializeConsoleValue(value);
  const copyText = typeof serialized === "string" ? serialized : JSON.stringify(serialized, null, 2) ?? consoleValueToText(value);
  return <div className="font-mono text-xs">
    <div className="flex items-start gap-1 py-0.5" style={{ paddingLeft: `${depth * 14}px` }}>
      <button type="button" disabled={!expandable} onClick={() => setOpen(current => !current)} className={`w-3 shrink-0 ${expandable ? "text-primary" : "text-transparent"}`}>{expandable ? (open ? "▾" : "▸") : "·"}</button>
      {name !== undefined && <><span className="text-purple-300 break-all">{name}</span><span className="text-muted-foreground">:</span></>}
      <span className={`break-all ${circular ? "text-red-300" : objectValue ? "text-foreground" : valueColor(value)}`}>{display}</span>
      <span className="text-[9px] text-muted-foreground ml-1">{typeName(value)}</span>
      <button type="button" onClick={() => void navigator.clipboard.writeText(copyText)} className="ml-auto text-[9px] text-muted-foreground hover:text-foreground">copiar</button>
    </div>
    {open && functionValue && <div style={{ marginLeft: `${(depth + 1) * 14}px` }}><div className="grid grid-cols-3 gap-2 mt-1 text-[10px]"><span className="text-muted-foreground">nome <b className="text-foreground">{functionValue.name || "anonymous"}</b></span><span className="text-muted-foreground">argumentos <b className="text-foreground">{functionValue.length}</b></span><span className="text-muted-foreground">construtor <b className="text-foreground">{functionValue.constructor?.name ?? "Function"}</b></span></div><FunctionSource value={functionValue}/></div>}
    {open && children.map((child, index) => <ConsoleValueInspector key={`${child.key}-${index}`} value={child.value} name={child.key} depth={depth + 1} ancestors={objectValue ? [...ancestors, objectValue] : ancestors}/>)}
  </div>;
}

