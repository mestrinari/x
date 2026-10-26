import { DevToolsDocumentContext } from './windowContext';
import { useState, useEffect, useContext } from "react";
import { Terminal, Wifi, PlayCircle, ChevronRight, Search, ChevronDown, CheckCircle2, RefreshCw, Repeat, Eye, Trash2, X, Menu } from "lucide-react";
import { CONSOLE_LEVELS, consoleValueToText, serializeConsoleValue, useConsoleLogger, type ConsoleLogEntry } from "./consoleLogger";
import { ConsoleValueInspector, isComplexConsoleValue } from "./ConsoleValueInspector";
import { buildSafeCurl, formatNetworkValue, sanitizeNetworkUrl, sanitizeNetworkValue } from "./networkEvidence";
import { useNetworkLogger, type NetworkLog } from "./useNetworkLogger";
import { useDevErrors } from "./devErrorMonitor";
import { useNetworkSimulator, type SimulationMode } from "./networkSimulator";


function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warn" | "danger" | "info" | "neutral" }) {
  const cls = {
    default: "bg-primary/10 text-primary",
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warn:    "bg-amber-500/10  text-amber-400  border border-amber-500/20",
    danger:  "bg-red-500/10   text-red-400    border border-red-500/20",
    info:    "bg-blue-500/10  text-blue-400   border border-blue-500/20",
    neutral: "bg-muted text-muted-foreground border border-border",
  }[variant];
  return <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${cls}`}>{children}</span>;
}

function MethodBadge({ method }: { method: string }) {
  const c: Record<string, string> = {
    GET:    "text-emerald-400 bg-emerald-500/10",
    POST:   "text-blue-400 bg-blue-500/10",
    PUT:    "text-amber-400 bg-amber-500/10",
    PATCH:  "text-purple-400 bg-purple-500/10",
    DELETE: "text-red-400 bg-red-500/10",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${c[method] ?? "text-muted-foreground bg-muted"}`}>
      {method}
    </span>
  );
}

function StatusCode({ code }: { code: number }) {
  const c = code >= 500 ? "text-red-400" : code >= 400 ? "text-amber-400" : "text-emerald-400";
  return <span className={`font-mono text-xs font-bold ${c}`}>{code}</span>;
}

function LogLevel({ level }: { level: string }) {
  const styles: Record<string, string> = {
    ERROR: "text-red-400 bg-red-500/10",
    WARN:  "text-amber-400 bg-amber-500/10",
    INFO:  "text-blue-400 bg-blue-500/10",
    DEBUG: "text-muted-foreground bg-muted",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold w-14 text-center ${styles[level]}`}>
      {level}
    </span>
  );
}

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  newMenu?: boolean;
  onClickNewMenu?: () => void; // Fixed: removed the illegal prop mutation
}

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  newMenu = false,
  onClickNewMenu
}: ModalProps) {
  const targetDocument = useContext(DevToolsDocumentContext);
  
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { 
      if (event.key === "Escape") onClose(); 
    };
    
    const targetWindow = targetDocument?.defaultView ?? window;
    targetWindow.addEventListener("keydown", closeOnEscape);
    return () => targetWindow.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open, targetDocument]);

  if (!open) return null;

  const sizeMap = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };
  const modalTone = /chamado|bug/i.test(title) ? "danger" : /http|requisi|chamada/i.test(title) ? "info" : /erro/i.test(title) ? "danger" : "special";

  return (
    <div className="qa-internal-modal-layer fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Dialog */}
      <div data-ux-modal data-ux-tone={modalTone} role="dialog" aria-modal="true" aria-label={title} className={`qa-internal-modal-dialog relative bg-card border border-border rounded-lg shadow-2xl w-full ${sizeMap[size]} flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="qa-modal-heading text-sm font-semibold font-mono">{title}</span>
          
          <div className="flex items-center gap-2">
            {/* New Menu Button (Rendered conditionally) */}
            {newMenu && onClickNewMenu && (
              <button 
                onClick={onClickNewMenu} 
                aria-label="Abrir menu" 
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
              >
                <Menu size={15} /> 
              </button>
            )}

            {/* Close Button */}
            <button 
              onClick={onClose} 
              aria-label="Fechar modal" 
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded hover:bg-muted"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body (Added missing children rendering) */}
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>

      </div>
    </div>
  );
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 1);
  if (data === null) return <span className="text-muted-foreground font-mono text-xs">null</span>;
  if (typeof data === "boolean") return <span className={`font-mono text-xs ${data ? "text-emerald-400" : "text-red-400"}`}>{String(data)}</span>;
  if (typeof data === "number") return <span className="text-amber-400 font-mono text-xs">{data}</span>;
  if (typeof data === "string") return <span className="text-emerald-300 font-mono text-xs">&quot;{data}&quot;</span>;
  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground font-mono text-xs">[]</span>;
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-blue-400 font-mono text-xs hover:underline">
          {collapsed ? `[…${data.length}]` : "["}
        </button>
        {!collapsed && (
          <div className="pl-4 border-l border-border/50 ml-1">
            {data.map((v, i) => (
              <div key={i}><JsonTree data={v} depth={depth + 1} />{i < data.length - 1 && <span className="text-muted-foreground font-mono text-xs">,</span>}</div>
            ))}
            <span className="text-blue-400 font-mono text-xs">]</span>
          </div>
        )}
      </span>
    );
  }
  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-muted-foreground font-mono text-xs">{"{}"}</span>
    // console.log(entries, "en")
    return (
      <span>
        <button onClick={() => setCollapsed(!collapsed)} className="text-blue-400 font-mono text-xs hover:underline">
          {collapsed ? `{…${entries.length}}` : "{"}
        </button>
        {!collapsed && (
          <div className="pl-4 border-l border-border/50 ml-1">
            {entries.map(([k, v], i) => (
              <div key={k} className="flex gap-1">
                <span className="text-purple-400 font-mono text-xs">&quot;{k}&quot;</span>
                <span className="text-muted-foreground font-mono text-xs">:</span>
                <JsonTree data={v} depth={depth + 1} />
                {i < entries.length - 1 && <span className="text-muted-foreground font-mono text-xs">,</span>}
              </div>
            ))}
            <span className="text-blue-400 font-mono text-xs">{"}"}</span>
          </div>
        )}
      </span>
    );
  }
  return null;
}

function jsonDisplayValue(value: unknown) {
  const sanitized = sanitizeNetworkValue(value);
  if (typeof sanitized !== "string") return sanitized;
  try { return JSON.parse(sanitized) as unknown; }
  catch { return sanitized; }
}

function JsonCodeBlock({ value, emptyLabel }: { value: unknown; emptyLabel: string }) {
  if (value === undefined) return <div className="text-[11px] font-mono text-muted-foreground italic">{emptyLabel}</div>;
  return (
    <div className="bg-muted/50 border border-border rounded p-3 max-h-72 overflow-auto select-text leading-5">
      <JsonTree data={jsonDisplayValue(value)} />
    </div>
  );
}

type UxTextRole = "request" | "response" | "auth" | "token" | "headers" | "payload" | "code" | "meta";

function networkTextRole(label: string): UxTextRole {
  if (/resposta|resultado|response/i.test(label)) return "response";
  if (/token|authorization|autentica/i.test(label)) return "token";
  if (/header/i.test(label)) return "headers";
  if (/payload|body|query/i.test(label)) return "payload";
  if (/curl|fetch|axios|snippet/i.test(label)) return "code";
  if (/origem|rastreamento|dura|tamanho|tempo/i.test(label)) return "meta";
  return "request";
}

function CollapsibleDetailBlock({ title, value, emptyLabel, defaultOpen = false }: { title: string; value: unknown; emptyLabel: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const copyValue = formatNetworkValue(value, emptyLabel);
  const role = networkTextRole(title);
  return (
    <section data-ux-role={role} className="border border-border rounded-md overflow-hidden bg-card/40">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="flex flex-1 items-center gap-2 text-left">
          {open ? <ChevronDown size={12} className="text-primary"/> : <ChevronRight size={12} className="text-muted-foreground"/>}
          <span className="text-[10px] uppercase tracking-wider font-mono font-semibold">{title}</span>
        </button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(copyValue)} className="text-[10px] font-mono text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted">Copiar</button>
      </div>
      {open && <div className="p-3 border-t border-border"><JsonCodeBlock value={value} emptyLabel={emptyLabel}/></div>}
    </section>
  );
}

function NetworkMetric({ label, children }: { label: string; children: React.ReactNode }) {
  return <div data-ux-role={networkTextRole(label)} className="bg-muted/30 border border-border/50 p-3 rounded"><div className="qa-text-label text-[9px] uppercase tracking-wider mb-1">{label}</div><div className="qa-text-value font-mono text-xs font-semibold">{children}</div></div>;
}

function downloadText(filename: string, contents: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ConsoleDetailSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className="border border-border rounded-md overflow-hidden"><button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="flex w-full items-center gap-2 bg-muted/20 px-3 py-2 text-left"><span className="text-primary">{open ? "▾" : "▸"}</span><span className="text-[10px] font-mono font-semibold uppercase tracking-wider">{title}</span></button>{open && <div className="border-t border-border p-3">{children}</div>}</section>;
}

function ConsoleEntryDetails({ entry, onRemove, onTogglePinned }: { entry: ConsoleLogEntry; onRemove: () => void; onTogglePinned: () => void }) {
  const copyPayload = JSON.stringify({ id: entry.id, level: entry.level, timestamp: new Date(entry.timestamp).toISOString(), source: entry.source, stack: entry.stack, signature: entry.signature, count: entry.count, pinned: entry.pinned, args: entry.args.map(argument => serializeConsoleValue(argument)) }, null, 2);
  return <div className="p-4 space-y-3 font-mono text-xs">
    <div className="flex flex-wrap gap-2"><button onClick={onTogglePinned} className="px-3 py-1.5 border border-border rounded hover:bg-muted">{entry.pinned ? "Desafixar" : "Fixar"}</button><button onClick={() => void navigator.clipboard.writeText(copyPayload)} className="px-3 py-1.5 border border-border rounded hover:bg-muted">Copiar registro completo</button><button onClick={onRemove} className="px-3 py-1.5 border border-red-500/30 text-red-400 rounded hover:bg-red-500/10">Remover</button></div>
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2"><NetworkMetric label="Nível"><LogLevel level={entry.level.toUpperCase()}/></NetworkMetric><NetworkMetric label="Horário">{new Date(entry.timestamp).toLocaleString("pt-BR", { hour12: false })}</NetworkMetric><NetworkMetric label="Ocorrências">{entry.count}</NetworkMetric><NetworkMetric label="Fixado">{entry.pinned ? "Sim" : "Não"}</NetworkMetric><NetworkMetric label="Argumentos">{entry.args.length}</NetworkMetric><NetworkMetric label="ID"><span className="break-all text-[10px]">{entry.id}</span></NetworkMetric></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2"><NetworkMetric label="Origem"><span className="break-all">{entry.source ?? "Indisponível"}</span></NetworkMetric><NetworkMetric label="Assinatura"><span className="break-all text-[10px]">{entry.signature}</span></NetworkMetric></div>
    <ConsoleDetailSection title="Mensagem consolidada" defaultOpen><div className="rounded border border-border bg-muted/50 p-3 text-foreground select-text whitespace-pre-wrap break-all">{entry.searchText || "(sem conteúdo)"}</div></ConsoleDetailSection>
    <ConsoleDetailSection title={`Argumentos (${entry.args.length})`} defaultOpen><div className="rounded border border-border bg-muted/50 py-2 overflow-auto select-text">{entry.args.length ? entry.args.map((argument, index) => <ConsoleValueInspector key={index} value={argument} name={`args[${index}]`}/>) : <span className="px-3 text-muted-foreground">Nenhum argumento informado.</span>}</div></ConsoleDetailSection>
    <ConsoleDetailSection title="Stack de captura"><pre className="max-h-72 overflow-auto rounded border border-border bg-muted/50 p-3 text-[10px] leading-5 text-muted-foreground whitespace-pre-wrap select-text">{entry.stack ?? "Stack indisponível"}</pre></ConsoleDetailSection>
    {entry.args.some(argument => argument instanceof Error) && <ConsoleDetailSection title="Stack dos erros" defaultOpen><pre className="max-h-72 overflow-auto rounded border border-red-500/20 bg-red-500/5 p-3 text-[10px] leading-5 text-red-300 whitespace-pre-wrap select-text">{entry.args.filter((argument): argument is Error => argument instanceof Error).map(error => error.stack ?? `${error.name}: ${error.message}`).join("\n\n")}</pre></ConsoleDetailSection>}
  </div>;
}

function GlobalConsoleEntry({ entry, onRemove, onTogglePinned }: { entry: ConsoleLogEntry; onRemove: () => void; onTogglePinned: () => void }) {
  const [open, setOpen] = useState(entry.args.some(isComplexConsoleValue));
  return <article className={`border rounded-md overflow-hidden ${entry.level === "error" ? "border-red-500/30" : entry.level === "warn" ? "border-amber-500/30" : "border-border"}`}><button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="flex w-full items-start gap-2 bg-card/70 px-3 py-2.5 text-left hover:bg-muted/30"><span className="mt-0.5 text-primary">{open ? "▾" : "▸"}</span><LogLevel level={entry.level.toUpperCase()}/><span className="w-20 shrink-0 text-[10px] font-mono text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString("pt-BR", { hour12: false })}</span><span className="flex-1 break-all text-xs font-mono">{entry.args.map(consoleValueToText).join(" ") || "(sem argumentos)"}</span>{entry.count > 1 && <Badge variant="neutral">x{entry.count}</Badge>}{entry.pinned && <Badge variant="warn">fixado</Badge>}</button>{open && <div className="border-t border-border"><ConsoleEntryDetails entry={entry} onTogglePinned={onTogglePinned} onRemove={onRemove}/></div>}</article>;
}

function GlobalConsoleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logger = useConsoleLogger();
  const [search, setSearch] = useState("");
  const [onlyComplex, setOnlyComplex] = useState(false);
  const [levels, setLevels] = useState<Set<string>>(() => new Set(CONSOLE_LEVELS));
  const toggleLevel = (level: string) => setLevels(current => { const next = new Set(current); if (next.has(level)) next.delete(level); else next.add(level); return next; });
  const filtered = logger.entries.filter(entry => levels.has(entry.level) && (!onlyComplex || entry.args.some(isComplexConsoleValue)) && (!search || `${entry.level} ${entry.searchText} ${entry.source ?? ""}`.toLowerCase().includes(search.toLowerCase()))).sort((first, second) => first.pinned === second.pinned ? second.timestamp - first.timestamp : first.pinned ? -1 : 1);
  const exportJson = () => downloadText("console-session.json", JSON.stringify(filtered.map(entry => ({ ...entry, timestamp: new Date(entry.timestamp).toISOString(), args: entry.args.map(argument => serializeConsoleValue(argument)) })), null, 2), "application/json");
  return <Modal open={open} onClose={onClose} title={`Console global · ${filtered.length} de ${logger.entries.length}`} size="xl"><div className="flex flex-col h-fit-content"><div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/50 p-3"><div className="flex overflow-hidden rounded border border-border">{CONSOLE_LEVELS.map(level => <button key={level} onClick={() => toggleLevel(level)} className={`px-2 py-1.5 text-[9px] font-mono uppercase ${levels.has(level) ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>{level}</button>)}</div><div className="flex min-w-48 flex-1 items-center gap-1.5 rounded bg-muted px-2 py-1.5"><Search size={11}/><input aria-label="Filtrar console global" value={search} onChange={event => setSearch(event.target.value)} placeholder="Mensagem, origem ou nível..." className="flex-1 bg-transparent text-xs font-mono outline-none"/></div><label className="flex items-center gap-1.5 text-[10px] font-mono"><input type="checkbox" checked={onlyComplex} onChange={event => setOnlyComplex(event.target.checked)}/>Objetos/funções</label><select aria-label="Limite do console global" value={logger.maxEntries} onChange={event => logger.setMaxEntries(Number(event.target.value))} className="rounded border border-border bg-muted px-2 py-1.5 text-[10px] font-mono">{[100,250,500,1000,2500].map(limit => <option key={limit} value={limit}>{limit} logs</option>)}</select><button onClick={() => logger.setPaused(!logger.paused)} className={`px-2 py-1.5 text-[10px] font-mono border rounded ${logger.paused ? "border-amber-500 text-amber-400" : "border-border text-emerald-400"}`}>{logger.paused ? "Retomar" : "Ao vivo"}</button><button onClick={exportJson} className="px-2 py-1.5 text-[10px] font-mono border border-border rounded">Exportar</button><button onClick={logger.clearUnpinned} className="px-2 py-1.5 text-[10px] font-mono border border-border rounded">Limpar</button></div><div className="flex-1 overflow-y-auto p-3 space-y-2">{filtered.map(entry => <GlobalConsoleEntry key={entry.id} entry={entry} onTogglePinned={() => logger.togglePinned(entry.id)} onRemove={() => logger.removeEntry(entry.id)}/>)}{!filtered.length && <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Terminal size={34} className="opacity-20"/><span className="mt-2 text-xs font-mono">Nenhum log encontrado</span></div>}</div></div></Modal>;
}

function bytesLabel(value?: number) {
  if (value === undefined) return "—";
  if (value < 1024) return `${value} B`;
  return `${(value / 1024).toFixed(1)} KB`;
}

function requestPath(url: string) {
  try { return new URL(url, window.location.origin).pathname + new URL(url, window.location.origin).search; }
  catch { return url; }
}

function editableRequestHeaders(log: NetworkLog) {
  return Object.fromEntries(
    Object.entries(log.headers ?? {}).filter(([, value]) => value !== "[REDACTED]"),
  );
}

function editableRequestPayload(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return JSON.stringify(value, null, 2);
  try { return JSON.stringify(JSON.parse(value), null, 2); }
  catch { return value; }
}

interface NetworkReplayResult {
  url: string;
  status: number;
  statusText: string;
  duration: number;
  requestSize: number;
  responseSize: number;
  responseHeaders: Record<string, string>;
  response: unknown;
}



function NetworkDetails({ log }: { log: NetworkLog }) {
  const [copied, setCopied] = useState("");
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayUrl, setReplayUrl] = useState(log.url);
  const [replayHeaders, setReplayHeaders] = useState(() => JSON.stringify(editableRequestHeaders(log), null, 2));
  const [replayPayload, setReplayPayload] = useState(() => editableRequestPayload(log.bodyPayload));
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayFeedback, setReplayFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [replayResult, setReplayResult] = useState<NetworkReplayResult | null>(null);
  useEffect(() => {
    setReplayUrl(log.url);
    setReplayHeaders(JSON.stringify(editableRequestHeaders(log), null, 2));
    setReplayPayload(editableRequestPayload(log.bodyPayload));
    setReplayFeedback(null);
    setReplayResult(null);
    setReplayOpen(false);
  }, [log.id, log.url, log.bodyPayload, log.headers]);
  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1500);
  };
  const fetchSnippet = `fetch(${JSON.stringify(sanitizeNetworkUrl(log.url))}, ${JSON.stringify(sanitizeNetworkValue({ method: log.method, headers: log.headers, ...(log.bodyPayload === undefined ? {} : { body: JSON.stringify(log.bodyPayload) }) }), null, 2)})`;
  const axiosSnippet = `axios(${JSON.stringify(sanitizeNetworkValue({ url: sanitizeNetworkUrl(log.url), method: log.method.toLowerCase(), headers: log.headers, ...(log.bodyPayload === undefined ? {} : { data: log.bodyPayload }) }), null, 2)})`;
  const retry = async () => {
    setReplayFeedback(null);
    setReplayResult(null);
    let headers: Record<string, string>;
    try {
      const parsed = JSON.parse(replayHeaders || "{}");
      if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") throw new Error();
      headers = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
    } catch {
      setReplayFeedback({ kind: "error", message: "Headers inválidos. Informe um objeto JSON com pares de chave e valor." });
      return;
    }
    const methodHasBody = !["GET", "HEAD"].includes(log.method.toUpperCase());
    let body: string | undefined;
    if (methodHasBody && replayPayload.trim()) {
      try { body = JSON.stringify(JSON.parse(replayPayload)); }
      catch { body = replayPayload; }
    }
    setReplayLoading(true);
    const startedAt = performance.now();
    try {
      const response = await fetch(replayUrl.trim(), {
        method: log.method,
        headers,
        ...(body === undefined ? {} : { body }),
      });
      const responseText = await response.text();
      const duration = Math.round(performance.now() - startedAt);
      const replayResponseHeaders = Object.fromEntries(response.headers.entries());
      let responseBody: unknown = responseText;
      if (responseText) {
        try { responseBody = JSON.parse(responseText); }
        catch { /* Mantém respostas que não são JSON como texto. */ }
      } else {
        responseBody = undefined;
      }
      setReplayResult({
        url: replayUrl.trim(),
        status: response.status,
        statusText: response.statusText,
        duration,
        requestSize: new Blob([body ?? ""]).size,
        responseSize: new Blob([responseText]).size,
        responseHeaders: replayResponseHeaders,
        response: responseBody,
      });
      setReplayFeedback({
        kind: response.ok ? "success" : "error",
        message: response.ok
          ? `Chamada concluída com status ${response.status} em ${duration}ms.`
          : `Chamada concluída com status ${response.status} em ${duration}ms.`,
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível repetir a chamada.";
      const duration = Math.round(performance.now() - startedAt);
      setReplayResult({
        url: replayUrl.trim(),
        status: 0,
        statusText: "Falha de rede",
        duration,
        requestSize: new Blob([body ?? ""]).size,
        responseSize: 0,
        responseHeaders: {},
        response: { error: message },
      });
      setReplayFeedback({ kind: "error", message });
    } finally {
      setReplayLoading(false);
    }
  };
  const totalSize = (log.requestSize ?? 0) + (log.responseSize ?? 0);
  return (
    <div data-ux-scope="http-detail" className="p-4 space-y-4 font-mono text-xs">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void copy("curl", buildSafeCurl(log))} className="px-3 py-1.5 border border-border rounded hover:bg-muted">{copied === "curl" ? "Copiado" : "Copiar cURL"}</button>
        <button onClick={() => void copy("fetch", fetchSnippet)} className="px-3 py-1.5 border border-border rounded hover:bg-muted">{copied === "fetch" ? "Copiado" : "Copiar fetch"}</button>
        <button onClick={() => void copy("axios", axiosSnippet)} className="px-3 py-1.5 border border-border rounded hover:bg-muted">{copied === "axios" ? "Copiado" : "Copiar Axios"}</button>
        <button onClick={() => { setReplayOpen(current => !current); setReplayFeedback(null); }} className="px-3 py-1.5 border border-primary/40 text-primary rounded hover:bg-primary/10">{replayOpen ? "Fechar repetição" : "Editar e repetir chamada"}</button>
      </div>
      {replayOpen && <section data-ux-role="request" className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-[10px] uppercase tracking-wider font-semibold text-primary">Repetir chamada</div><div className="mt-1 text-[10px] text-muted-foreground">Edite os dados antes de enviar. O método será mantido como {log.method}.</div></div>
          <MethodBadge method={log.method}/>
        </div>
        <label className="block space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">URL</span>
          <input value={replayUrl} onChange={event => setReplayUrl(event.target.value)} spellCheck={false} className="w-full rounded border border-input bg-input-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"/>
        </label>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <label data-ux-role="headers" className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Headers (JSON)</span>
            <textarea value={replayHeaders} onChange={event => setReplayHeaders(event.target.value)} spellCheck={false} rows={9} className="w-full resize-y rounded border border-input bg-input-background p-3 text-xs leading-5 font-mono outline-none focus:border-primary"/>
          </label>
          <label data-ux-role="payload" className="block space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Payload {!["GET", "HEAD"].includes(log.method.toUpperCase()) ? "(JSON ou texto)" : "(não enviado para este método)"}</span>
            <textarea value={replayPayload} onChange={event => setReplayPayload(event.target.value)} disabled={["GET", "HEAD"].includes(log.method.toUpperCase())} spellCheck={false} rows={9} placeholder="Sem payload" className="w-full resize-y rounded border border-input bg-input-background p-3 text-xs leading-5 font-mono outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"/>
          </label>
        </div>
        {replayFeedback && <div role="status" className={`rounded border px-3 py-2 text-[11px] ${replayFeedback.kind === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>{replayFeedback.message}</div>}
        <div className="flex justify-end">
          <button onClick={() => void retry()} disabled={replayLoading || !replayUrl.trim()} className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">{replayLoading ? <RefreshCw size={13} className="animate-spin"/> : <Repeat size={13}/>} {replayLoading ? "Enviando..." : "Enviar chamada"}</button>
        </div>
        {replayResult && <div data-ux-role="response" className="space-y-2 border-t border-primary/20 pt-3">
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wider font-semibold text-primary">Resultado da nova chamada</span><span className="text-[10px] text-muted-foreground">{replayResult.statusText}</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <NetworkMetric label="Status">{replayResult.status === 0 ? <span className="text-red-400">Falha de rede</span> : <StatusCode code={replayResult.status}/>}</NetworkMetric>
            <NetworkMetric label="Duração">{replayResult.duration}ms</NetworkMetric>
            <NetworkMetric label="Requisição">{bytesLabel(replayResult.requestSize)}</NetworkMetric>
            <NetworkMetric label="Resposta">{bytesLabel(replayResult.responseSize)}</NetworkMetric>
          </div>
          <CollapsibleDetailBlock title="URL executada" value={replayResult.url} emptyLabel="URL indisponível"/>
          <CollapsibleDetailBlock title="Headers da nova resposta" value={replayResult.responseHeaders} emptyLabel="Sem headers na resposta"/>
          <CollapsibleDetailBlock title="Resultado da nova resposta" value={replayResult.response} emptyLabel="Resposta vazia" defaultOpen/>
        </div>}
      </section>}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <NetworkMetric label="Método"><MethodBadge method={log.method}/></NetworkMetric>
        <NetworkMetric label="Status">{log.status === undefined ? "Pendente" : <StatusCode code={log.status}/>}</NetworkMetric>
        <NetworkMetric label="Duração">{log.duration === undefined ? "—" : `${log.duration}ms`}</NetworkMetric>
        <NetworkMetric label="Requisição">{bytesLabel(log.requestSize)}</NetworkMetric>
        <NetworkMetric label="Resposta">{bytesLabel(log.responseSize)}</NetworkMetric>
        <NetworkMetric label="Tamanho total">{bytesLabel(totalSize || undefined)}</NetworkMetric>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <NetworkMetric label="Origem"><span className="break-all">{log.page}</span></NetworkMetric>
        <NetworkMetric label="Rastreamento"><span className="break-all">{log.traceId ?? log.id}</span></NetworkMetric>
      </div>
      <div className="space-y-2">
        <CollapsibleDetailBlock title="URL completa" value={sanitizeNetworkUrl(log.url)} emptyLabel="URL indisponível" defaultOpen/>
        <CollapsibleDetailBlock title="Headers da requisição" value={log.headers} emptyLabel="Sem headers"/>
        <CollapsibleDetailBlock title="Query / payload enviado" value={log.payload} emptyLabel="Sem payload" defaultOpen/>
        <CollapsibleDetailBlock title="Headers da resposta" value={log.responseHeaders} emptyLabel="Headers indisponíveis"/>
        <CollapsibleDetailBlock title="Resultado / resposta" value={log.response} emptyLabel="Aguardando resposta" defaultOpen/>
        <CollapsibleDetailBlock title="cURL seguro" value={buildSafeCurl(log)} emptyLabel="cURL indisponível"/>
      </div>
    </div>
  );
}

function GlobalNetworkCall({ log }: { log: NetworkLog }) {
  const [open, setOpen] = useState(false);
  return (
    <article data-ux-role="request" className={`border rounded-md overflow-hidden ${log.status === 0 || Number(log.status) >= 500 ? "border-red-500/30" : Number(log.status) >= 400 ? "border-amber-500/30" : "border-border"}`}>
      <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2.5 bg-card/70 hover:bg-muted/30 text-left font-mono text-xs">
        {open ? <ChevronDown size={12} className="text-primary shrink-0"/> : <ChevronRight size={12} className="text-muted-foreground shrink-0"/>}
        <MethodBadge method={log.method}/>
        <span className="flex-1 truncate" title={log.url}>{requestPath(log.url)}</span>
        {log.status === undefined ? <Badge variant="neutral">pendente</Badge> : <StatusCode code={log.status}/>}
        <span className="text-muted-foreground w-16 text-right">{log.duration === undefined ? "—" : `${log.duration}ms`}</span>
        <span className="text-muted-foreground w-16 text-right">{bytesLabel((log.requestSize ?? 0) + (log.responseSize ?? 0) || undefined)}</span>
      </button>
      {open && <div className="border-t border-border"><NetworkDetails log={log}/></div>}
    </article>
  );
}

function GlobalNetworkGroup({ path, logs, defaultOpen }: { path: string; logs: NetworkLog[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const failures = logs.filter(log => log.status === 0 || Number(log.status) >= 400).length;
  return (
    <section data-ux-role="meta" className="border border-border rounded-md overflow-hidden">
      <button type="button" onClick={() => setOpen(current => !current)} aria-expanded={open} className="w-full flex items-center gap-2 px-3 py-2 bg-muted/20 hover:bg-muted/40 text-left font-mono text-xs">
        {open ? <ChevronDown size={12} className="text-primary"/> : <ChevronRight size={12}/>}<span className="flex-1 font-semibold">{path}</span><Badge variant="neutral">{logs.length} req</Badge>{failures > 0 && <Badge variant="danger">{failures} erro{failures > 1 ? "s" : ""}</Badge>}
      </button>
      {open && <div className="p-2 space-y-2 border-t border-border">{logs.map(log => <GlobalNetworkCall key={log.id} log={log}/>)}</div>}
    </section>
  );
}

function GlobalNetworkModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const logs = useNetworkLogger(state => state.logs);
  const navigations = useNetworkLogger(state => state.navigations);
  const clearLogs = useNetworkLogger(state => state.clearLogs);
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [grouped, setGrouped] = useState(true);
  const filtered = logs.filter(log => {
    const query = search.trim().toLowerCase();
    if (query && !`${log.method} ${log.url} ${log.page}`.toLowerCase().includes(query)) return false;
    if (method !== "ALL" && log.method !== method) return false;
    if (status === "pending") return log.status === undefined;
    if (status === "2xx") return log.status !== undefined && log.status >= 200 && log.status < 300;
    if (status === "4xx") return log.status !== undefined && log.status >= 400 && log.status < 500;
    if (status === "5xx") return log.status !== undefined && log.status >= 500;
    return true;
  });
  const groups = [...navigations].reverse().map(navigation => ({ ...navigation, logs: filtered.filter(log => log.navigationId === navigation.id) })).filter(group => group.logs.length > 0);
  return (
    <Modal open={open} onClose={onClose} title={`Chamadas HTTP · ${filtered.length} de ${logs.length}`} size="xl">
      <div className="flex flex-col min-h-[5vh] max-h-[80vh]">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border bg-card/50">
          <div className="flex rounded border border-border overflow-hidden"><button onClick={() => setGrouped(true)} className={`px-2.5 py-1.5 text-[10px] font-mono ${grouped ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}>Por página</button><button onClick={() => setGrouped(false)} className={`px-2.5 py-1.5 text-[10px] font-mono ${!grouped ? "bg-primary text-primary-foreground" : "bg-muted/30"}`}>Lista</button></div>
          <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1.5 flex-1 min-w-48"><Search size={11}/><input aria-label="Filtrar chamadas globais" value={search} onChange={event => setSearch(event.target.value)} placeholder="URL, método ou página..." className="bg-transparent outline-none text-xs font-mono flex-1"/></div>
          <select aria-label="Filtrar método global" value={method} onChange={event => setMethod(event.target.value)} className="bg-muted border border-border rounded px-2 py-1.5 text-[10px] font-mono">{["ALL", "GET", "POST", "PUT", "PATCH", "DELETE"].map(item => <option key={item}>{item}</option>)}</select>
          <select aria-label="Filtrar status global" value={status} onChange={event => setStatus(event.target.value)} className="bg-muted border border-border rounded px-2 py-1.5 text-[10px] font-mono">{["ALL", "pending", "2xx", "4xx", "5xx"].map(item => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => downloadText("network-session.json", JSON.stringify(sanitizeNetworkValue(filtered.map(log => ({ ...log, url: sanitizeNetworkUrl(log.url) }))), null, 2), "application/json")} className="px-2.5 py-1.5 border border-border rounded text-[10px] font-mono">Exportar JSON</button>
          <button onClick={clearLogs} className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-mono border border-border rounded hover:bg-muted"><Trash2 size={11}/>Limpar</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!filtered.length && <div className="flex flex-col items-center justify-center py-20 text-muted-foreground"><Wifi size={34} className="opacity-20"/><span className="mt-2 text-xs font-mono">Nenhuma chamada encontrada</span></div>}
          {grouped ? groups.map((group, index) => <GlobalNetworkGroup key={group.id} path={group.path} logs={group.logs} defaultOpen={index === 0}/>) : filtered.map(log => <GlobalNetworkCall key={log.id} log={log}/>) }
        </div>
      </div>
    </Modal>
  );
}

function RuntimeErrorsView() {
  const errors = useDevErrors(state => state.errors);
  const clear = useDevErrors(state => state.clear);
  const markKnown = useDevErrors(state => state.markKnown);
  const silence = useDevErrors(state => state.silence);
  const associate = useDevErrors(state => state.associate);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = errors.find(error => error.id === selectedId) ?? null;
  const activeErrors = errors.filter(error => !error.silencedUntil || error.silencedUntil < Date.now());
  return <div className="flex flex-col h-full"><div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card/50"><div className="text-xs font-mono text-muted-foreground">{activeErrors.length} assinaturas ativas · erros repetidos são agrupados pela assinatura</div><button onClick={clear} className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono border border-border rounded"><Trash2 size={11}/>Limpar</button></div><div className="flex-1 overflow-auto"><table className="w-full text-xs font-mono"><thead><tr className="border-b border-border">{["Tipo", "Mensagem", "Rota", "Ocorrências", "Primeira", "Última", "Estado", ""].map(header => <th key={header} className="text-left px-4 py-2.5 text-muted-foreground text-[10px] uppercase font-normal">{header}</th>)}</tr></thead><tbody>{errors.map(error => <tr key={error.id} onClick={() => setSelectedId(error.id)} className="border-b border-border/40 hover:bg-muted/20 cursor-pointer"><td className="px-4 py-3 text-red-300">{error.type}</td><td className="px-4 py-3 max-w-[300px] truncate">{error.message}</td><td className="px-4 py-3 text-blue-400">{error.route}</td><td className="px-4 py-3 text-amber-400 font-bold">{error.count}</td><td className="px-4 py-3 text-muted-foreground">{new Date(error.firstAt).toLocaleTimeString("pt-BR")}</td><td className="px-4 py-3 text-muted-foreground">{new Date(error.lastAt).toLocaleTimeString("pt-BR")}</td><td className="px-4 py-3">{error.silencedUntil && error.silencedUntil > Date.now() ? <Badge variant="neutral">silenciado</Badge> : error.known ? <Badge variant="warn">conhecido</Badge> : <Badge variant="danger">novo</Badge>}</td><td className="px-4 py-3"><Eye size={12}/></td></tr>)}</tbody></table>{!errors.length && <div className="flex flex-col items-center py-20 text-muted-foreground"><CheckCircle2 size={32} className="text-emerald-500/40"/><span className="mt-2 text-xs font-mono">Nenhum erro JavaScript, Promise ou React capturado</span></div>}</div><Modal open={!!selected} onClose={() => setSelectedId(null)} title={`Erro · ${selected?.type ?? ""}`} size="lg">{selected && <div className="p-4 space-y-3 font-mono text-xs"><div className="rounded border border-red-500/20 bg-red-500/5 p-3 text-red-300 break-all">{selected.message}</div><pre className="bg-muted/30 rounded p-3 whitespace-pre-wrap overflow-auto max-h-72 text-[10px]">{selected.stack ?? "Stack indisponível"}</pre>{selected.issue && <div className="text-blue-300">Associado a: {selected.issue}</div>}<div className="flex flex-wrap gap-2"><button onClick={() => markKnown(selected.id)} className="px-3 py-1.5 border border-border rounded">{selected.known ? "Marcar como novo" : "Marcar conhecido"}</button><button onClick={() => silence(selected.id, 30)} className="px-3 py-1.5 border border-border rounded">Silenciar 30 min</button><button onClick={() => { const issue = window.prompt("Código ou URL do chamado:", selected.issue ?? ""); if (issue) associate(selected.id, issue); }} className="px-3 py-1.5 border border-border rounded">Associar chamado</button></div></div>}</Modal></div>;
}

function RuntimeSimulatorView() {
  const simulator = useNetworkSimulator();
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("/api/chamados");
  const [body, setBody] = useState("{}");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState("/api/chamados");
  const [mode, setMode] = useState<SimulationMode>("status");
  const [status, setStatus] = useState(500);
  const send = async () => {
    setLoading(true);
    const started = performance.now();
    try {
      const result = await fetch(url, { method, headers: { "Content-Type": "application/json" }, ...(["GET", "HEAD"].includes(method) ? {} : { body }) });
      const text = await result.text();
      let parsed: unknown = text;
      try { parsed = JSON.parse(text); } catch { /* resposta textual */ }
      setResponse(JSON.stringify({ status: result.status, durationMs: Math.round(performance.now() - started), headers: Object.fromEntries(result.headers.entries()), body: parsed }, null, 2));
    } catch (error) {
      setResponse(JSON.stringify({ status: 0, durationMs: Math.round(performance.now() - started), error: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally { setLoading(false); }
  };
  const addRule = () => simulator.saveRule({ id: crypto.randomUUID(), name: `${mode} · ${route}`, route: route || "*", mode, status: mode === "status" ? status : undefined, latency: simulator.globalLatency, probability: 100, enabled: true });
  return <div className="p-5 space-y-4 h-full overflow-auto"><div className="grid grid-cols-2 gap-4"><div className="space-y-4"><div className="bg-card border border-border rounded-md p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-mono font-semibold text-muted-foreground uppercase">Requisição real interceptada</span><Badge variant={simulator.enabled ? "success" : "neutral"}>{simulator.enabled ? "simulação ativa" : "rede normal"}</Badge></div><div className="flex gap-2"><select value={method} onChange={event => setMethod(event.target.value)} className="bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono">{["GET", "POST", "PUT", "PATCH", "DELETE"].map(value => <option key={value}>{value}</option>)}</select><input value={url} onChange={event => setUrl(event.target.value)} className="flex-1 bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono outline-none"/></div>{!["GET", "HEAD"].includes(method) && <textarea value={body} onChange={event => setBody(event.target.value)} rows={6} className="w-full bg-muted/40 border border-border rounded p-2 text-xs font-mono"/>}<button onClick={() => void send()} disabled={loading} className="w-full px-4 py-2 bg-primary text-primary-foreground text-xs font-mono rounded flex items-center justify-center gap-2">{loading ? <RefreshCw size={12} className="animate-spin"/> : <PlayCircle size={12}/>}Enviar requisição</button></div><div className="bg-card border border-border rounded-md p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-mono font-semibold text-muted-foreground uppercase">Cenários de rede</span><button onClick={() => simulator.setEnabled(!simulator.enabled)} className={`px-3 py-1 rounded border text-[10px] font-mono ${simulator.enabled ? "border-emerald-500 text-emerald-400" : "border-border"}`}>{simulator.enabled ? "Desativar" : "Ativar"}</button></div><div className="grid grid-cols-3 gap-2"><input value={route} onChange={event => setRoute(event.target.value)} placeholder="Rota ou *" className="bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono"/><select value={mode} onChange={event => setMode(event.target.value as SimulationMode)} className="bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono">{["status", "offline", "intermittent", "timeout", "empty", "invalid-json", "incomplete", "large", "pagination", "duplicates", "shuffle", "nulls"].map(value => <option key={value}>{value}</option>)}</select><input type="number" value={status} disabled={mode !== "status"} onChange={event => setStatus(Number(event.target.value))} className="bg-muted border border-border rounded px-2 py-1.5 text-xs font-mono"/></div><div className="flex items-center gap-2"><label className="text-[10px] font-mono text-muted-foreground">Latência global</label><input type="number" min={0} value={simulator.globalLatency} onChange={event => simulator.setGlobalLatency(Number(event.target.value))} className="w-24 bg-muted border border-border rounded px-2 py-1 text-xs font-mono"/><span className="text-[10px] font-mono">ms</span><button onClick={addRule} className="ml-auto px-3 py-1.5 border border-primary/40 text-primary rounded text-[10px] font-mono">Adicionar regra</button></div><div className="space-y-1">{simulator.rules.map(rule => <div key={rule.id} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-2 text-[10px] font-mono"><span className="text-primary">{rule.route}</span><span>{rule.mode}{rule.status ? ` ${rule.status}` : ""}</span><span className="text-muted-foreground">{rule.latency}ms · {rule.probability}%</span><button onClick={() => simulator.saveRule({ ...rule, enabled: !rule.enabled })} className="ml-auto">{rule.enabled ? "ativa" : "pausada"}</button><button onClick={() => simulator.removeRule(rule.id)} className="text-red-400"><Trash2 size={11}/></button></div>)}</div></div></div><div className="bg-card border border-border rounded-md p-4"><span className="text-xs font-mono font-semibold text-muted-foreground uppercase">Resposta</span>{!response && !loading ? <div className="flex flex-col items-center py-20 text-muted-foreground"><PlayCircle size={32} className="opacity-20"/><span className="mt-2 text-xs font-mono">Execute uma requisição para inspecionar a resposta</span></div> : <pre className="mt-3 bg-muted/30 rounded p-3 overflow-auto max-h-[620px] whitespace-pre-wrap break-all text-xs font-mono">{response}</pre>}</div></div></div>;
}
export { GlobalNetworkModal, GlobalConsoleModal, RuntimeErrorsView, RuntimeSimulatorView };
