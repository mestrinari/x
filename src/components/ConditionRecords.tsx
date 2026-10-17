import { useEffect, useState } from 'react';
import type { Ticket } from '../types';
import { api } from '../api';
import { allPages, errorMessage } from '../api/resources';
import type { ChamadoFluxoEtapaExecucaoDependencia, ChamadoFluxoEtapaExecucaoTransicao } from '../api/types';
import { Button } from './ui';

export function ConditionRecords({ticket}:{ticket:Ticket}) {
  const [evaluations,setEvaluations]=useState<ChamadoFluxoEtapaExecucaoDependencia[]>([]);
  const [transitions,setTransitions]=useState<ChamadoFluxoEtapaExecucaoTransicao[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{let active=true;setLoading(true);setError('');
    Promise.all(ticket.dependencies.map(async d=>({
      evaluations:await allPages(p=>api.avaliacoesDependencias.list({...p,dependenciaId:d.id})),
      transitions:await allPages(p=>api.transicoes.list({...p,dependenciaId:d.id})),
    }))).then(rows=>{if(active){setEvaluations(rows.flatMap(r=>r.evaluations));setTransitions(rows.flatMap(r=>r.transitions));}}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[ticket,attempt]);
  const stages=ticket.flows.flatMap(f=>f.stages);
  const name=(id:string|number)=>stages.find(s=>s.id===String(id))?.name ?? String(id);
  return <section className="surface"><div className="surface-head"><div><h2>Condições e decisões registradas</h2><p>As regras não são avaliadas automaticamente pela API atual.</p></div><Button onClick={()=>setAttempt(x=>x+1)}>Atualizar</Button></div>
    {error && <p className="info-callout" role="alert">{error}</p>}
    {loading ? <p className="empty-inline" role="status">Carregando condições...</p> : <div className="form-grid">{ticket.dependencies.map(d=><section key={d.id} className="review-block"><div className="review-title"><h3>{name(d.sourceStageId)} → {name(d.targetStageId)}</h3><span>{d.condition}</span></div><div className="form-grid"><p>Critério: {d.expected}</p>
      {evaluations.filter(e=>String(e.dependenciaId)===d.id).map(e=><p key={'e'+e.id}>Execução #{e.execucaoId}: avaliação {e.statusAvaliacao}{e.validadoManualmente?' · Validada manualmente':''} · {new Date(e.avaliadoEm).toLocaleString('pt-BR')}</p>)}
      {transitions.filter(e=>String(e.dependenciaId)===d.id).map(e=><p key={'t'+e.id}>Transição #{e.id}: execução {e.execucaoOrigemId} → {e.execucaoDestinoId??'sem destino'} · Resultado {e.resultadoAvaliacao} · {e.motivoDecisao??'Sem observação'}</p>)}
      {!evaluations.some(e=>String(e.dependenciaId)===d.id)&&!transitions.some(e=>String(e.dependenciaId)===d.id)&&<p>Sem avaliações ou transições registradas.</p>}
    </div></section>)}{!ticket.dependencies.length&&<p>Nenhuma dependência cadastrada.</p>}</div>}
  </section>;
}
