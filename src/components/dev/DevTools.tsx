import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router';
import { FloatingWindow } from '../ImageEditorModal/PictureInPictureOptions';
import { DevToolsDocumentContext } from './windowContext';
import { Bug } from 'lucide-react';
import { GlobalNetworkModal, GlobalConsoleModal, RuntimeErrorsView, RuntimeSimulatorView } from './ReferencePanels';
import { useNetworkLogger } from './useNetworkLogger';
import { setNetworkLoggerRoute } from './networkLogger';
import { useDevTimeline } from './devTimeline';
import { usePerformanceMonitor } from './performanceMonitor';
import { useNetworkSimulator } from './networkSimulator';
import { sanitizeNetworkValue } from './networkEvidence';
import styles from './devtools.css?inline';

type Panel = 'network' | 'console' | 'errors' | 'simulator' | 'performance' | 'timeline';
export function DevTools() {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [panel, setPanel] = useState<Panel>('network');
  const location = useLocation();
  const logs = useNetworkLogger(state => state.logs);
  const simulation = useNetworkSimulator(state => state.enabled);
  useEffect(() => { if (host.current) setRoot(host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })); }, []);
  useEffect(() => {
    const route = location.pathname + location.search;
    setNetworkLoggerRoute(route); useNetworkLogger.getState().notifyNavigation(route);
  }, [location.pathname, location.search]);
  return <div ref={host} style={{ position: 'relative', zIndex: 1000 }}>{root && createPortal(<>
    <style>{styles}</style><div className="devtools-root">
      <FloatingWindow windowId="orbit-devtools" title="Orbit DevTools" width={1200} height={800} dark
        renderTrigger={(open, state) => <button className="dev-launcher" type="button" aria-label="Abrir DevTools em Picture-in-Picture" disabled={state.isOpening} onClick={open}><Bug size={17}/> {state.isOpening ? 'Abrindo...' : 'DevTools PiP'} · {logs.length}{simulation && ' · SIMULAÇÃO ATIVA'}</button>}>
        {(close, targetDocument) => <DevToolsWindow targetDocument={targetDocument}>
          <header className="dev-window-header"><strong>Orbit DevTools</strong><button type="button" onClick={close} aria-label="Fechar DevTools">Fechar ×</button></header>
          <nav className="dev-window-tabs" aria-label="Ferramentas de desenvolvimento">{([
            ['network', 'Network / HTTP'], ['console', 'Console'], ['errors', 'Erros'], ['simulator', 'Simulador'], ['performance', 'Performance'], ['timeline', 'Linha do tempo'],
          ] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={panel === id} onClick={() => setPanel(id)}>{label}</button>)}</nav>
          <main className="dev-workspace">
            {panel === 'network' && <GlobalNetworkModal open onClose={close}/>}
            {panel === 'console' && <GlobalConsoleModal open onClose={close}/>}
            {panel === 'errors' && <RuntimeErrorsView/>}
            {panel === 'simulator' && <RuntimeSimulatorView/>}
            {panel === 'performance' && <div className="p-4"><Performance/></div>}
            {panel === 'timeline' && <div className="p-4"><Timeline/></div>}
          </main>
        </DevToolsWindow>}
      </FloatingWindow>
    </div>
  </>, root)}</div>;
}
function DevToolsWindow({ targetDocument, children }: { targetDocument: Document; children: ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  useEffect(() => { if (host.current) setRoot(host.current.shadowRoot ?? host.current.attachShadow({ mode: 'open' })); }, []);
  return <div ref={host} style={{ position: 'fixed', inset: 0, zIndex: 1100 }}>{root && createPortal(<DevToolsDocumentContext.Provider value={targetDocument}>
    <style>{styles}</style><div className="devtools-root dev-window">{children}</div>
  </DevToolsDocumentContext.Provider>, root)}</div>;
}

function Performance() {
  const { samples, current } = usePerformanceMonitor();
  return <div className="space-y-4"><p className="text-xs text-muted-foreground">Medições locais. Carga estimada pela ocupação da interface; memória disponível apenas em navegadores compatíveis.</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['FPS', current?.fps], ['Latência HTTP', current ? `${current.latency} ms` : null], ['Memória', current?.memory == null ? 'Indisponível' : `${current.memory} MB`], ['Carga estimada', current ? `${current.cpu}%` : null]].map(([label,value]) => <div key={label} className="p-3 bg-muted rounded"><div>{label}</div><strong>{value ?? 'Coletando...'}</strong></div>)}</div><table className="w-full text-xs"><thead><tr>{['Horário','FPS','HTTP (ms)','Long tasks'].map(label=><th key={label} className="text-left p-2">{label}</th>)}</tr></thead><tbody>{[...samples].reverse().map(sample=><tr key={sample.timestamp}><td className="p-2">{sample.label}</td><td>{sample.fps}</td><td>{sample.latency}</td><td>{sample.longTasks}</td></tr>)}</tbody></table></div>;
}
function Timeline() {
  const { events, clear, paused, setPaused } = useDevTimeline();
  return <div><div className="flex gap-3 mb-3"><button onClick={() => setPaused(!paused)}>{paused ? 'Continuar' : 'Pausar'}</button><button onClick={clear}>Limpar</button></div>{events.map(event=><details key={event.id} className="border-b border-border p-2"><summary>{new Date(event.timestamp).toLocaleTimeString('pt-BR')} · {event.kind} · {event.title}</summary><pre className="whitespace-pre-wrap break-all text-xs p-2">{JSON.stringify(sanitizeNetworkValue(event),null,2)}</pre></details>)}</div>;
}
