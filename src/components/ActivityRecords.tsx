import { useEffect, useState } from 'react';
import { api } from '../api';
import { allPages, errorMessage } from '../api/resources';
import type { ChamadoFluxoHistorico } from '../api/types';
import type { Ticket } from '../types';
import { useDirectory } from '../app/Directory';
import { Badge, Button } from './ui';

export function ActivityRecords({ticket,mode}:{ticket:Ticket;mode:'executions'|'history'}) {
  const {userName}=useDirectory();
  const [history,setHistory]=useState<(ChamadoFluxoHistorico & {label:string;key:string})[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(mode==='history');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    if(mode!=='history') return;
    let active=true;setLoading(true);setError('');
    Promise.all(ticket.flows.flatMap(f=>[
      allPages(p=>api.historicos.fluxos.list({...p,fluxoId:f.id})).then(rows=>rows.map(r=>({...r,label:f.name,key:'f'+r.id}))),
      ...f.stages.map(s=>allPages(p=>api.historicos.etapas.list({...p,etapaId:s.id})).then(rows=>rows.map(r=>({...r,label:f.name+' / '+s.name,key:'s'+r.id})))),
    ])).then(rows=>{if(active)setHistory(rows.flat().sort((a,b)=>b.criadoEm.localeCompare(a.criadoEm)));}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[ticket,mode,attempt]);
  const executions=ticket.flows.flatMap(f=>f.stages.flatMap(s=>s.executions.map(e=>({...e,label:f.name+' / '+s.name}))));
  return <section className="surface"><div className="surface-head"><h2>{mode==='executions'?'Execuções':'Histórico'}</h2></div>
    {error && <div className="info-callout" role="alert">{error}<Button onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</Button></div>}
    {loading && mode==='history' ? <p className="empty-inline" role="status">Carregando histórico...</p> : <div className="table-scroll"><table><thead><tr><th>Fluxo / etapa</th><th>{mode==='executions'?'Execução':'Evento'}</th><th>Data</th><th>{mode==='executions'?'Resultado':'Usuário'}</th></tr></thead><tbody>
      {mode==='executions' ? executions.map(e=><tr key={e.id}><td>{e.label}</td><td>#{e.remoteNumber} <Badge>{e.status}</Badge></td><td>{e.remote?.iniciadoEm ? new Date(e.remote.iniciadoEm).toLocaleString('pt-BR') : 'Não iniciada'}</td><td>{e.result ?? '—'}</td></tr>) : history.map(e=><tr key={e.key}><td>{e.label}</td><td>{e.tipoEvento}{e.motivo && <p>{e.motivo}</p>}</td><td>{new Date(e.criadoEm).toLocaleString('pt-BR')}</td><td>{userName(e.criadoPor ? String(e.criadoPor) : '')}</td></tr>)}
    </tbody></table>{(mode==='executions'?executions:history).length===0 && <p className="empty-inline">Nenhum registro encontrado.</p>}</div>}
  </section>;
}
