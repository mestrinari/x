import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, ArrowRight } from 'lucide-react';
import { loadTickets, errorMessage } from '../api/resources';
import { Button, Badge } from '../components/ui';
import { PageHeader } from '../components/layout';
import type { Ticket } from '../types';

export function Dashboard() {
  const navigate=useNavigate();
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [attempt,setAttempt]=useState(0);

  useEffect(()=>{let active=true;

setLoading(true);setError('');loadTickets().then(x=>{if(active)setTickets(x);}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});

return()=>{active=false;};},[attempt]);

  return <><PageHeader eyebrow="Visão geral" title="Central de atendimento" description="Acompanhe os chamados da equipe." actions={<Button onClick={()=>navigate('/chamados/novo')}><Plus size={16}/> Novo chamado</Button>}/>
    {error && <div role="alert" className="info-callout">{error}<Button onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</Button></div>}
    {loading ? <p role="status">Carregando chamados...</p> : <><div className="metric-grid">{[['Total de chamados',tickets.length],['Em andamento',tickets.filter(t=>t.status==='Em andamento').length],['Concluídos',tickets.filter(t=>t.status==='Concluído').length]].map(([label,count])=><div className="metric" key={label}><span>{label}</span><strong>{count}</strong></div>)}</div><section className="surface"><div className="surface-head"><h2>Chamados recentes</h2><Button variant="ghost" onClick={()=>navigate('/chamados')}>Ver todos</Button></div><div className="recent-list">{tickets.slice(0,6).map(t=><button key={t.id} onClick={()=>navigate('/chamados/'+t.id)}><span><strong>{t.title}</strong><small>CH-{t.id}</small></span><Badge>{t.status}</Badge><ArrowRight size={16}/></button>)}{!tickets.length && <p className="empty-inline">Nenhum chamado cadastrado.</p>}</div></section></>}
  </>;
}

export function PlaceholderPage({title}:{title:string}) {
  return <><PageHeader title={title} description="Central de atendimento"/><section className="surface generic-state"><p>Consulte os fluxos, execuções e históricos dentro de cada chamado.</p></section></>;
}
