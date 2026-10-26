import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Filter, Plus, RefreshCw, Search, Ticket as TicketIcon } from 'lucide-react';
import { api, ApiError } from '../api';
import { chamadoToTicket, ticketAssigneeName, ticketDisplayId } from '../api/adapters';
import { useDirectory } from '../app/Directory';
import { loadTickets as fetchTickets } from '../api/resources';
import type { Ticket } from '../types';
import { Badge, Button, Input, Select } from '../components/ui';
import { PageHeader } from '../components/layout';

const priorityTone = { Baixa: 'neutral', Média: 'blue', Alta: 'amber', Crítica: 'red' } as const;

export function TicketsPage({ mine = false }: { mine?: boolean }) {
  const { userName, actorId } = useDirectory();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Todos');
  const [remoteTickets, setRemoteTickets] = useState<Ticket[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadTickets = useCallback(() => {
    let active = true;

    setLoading(true);
    setApiError(null);

    fetchTickets()
      .then((response) => {
        if (!active) return;
        setRemoteTickets(response);
        setApiError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setRemoteTickets(null);
        setApiError(error instanceof ApiError ? error.message : 'Não foi possível carregar os chamados da API.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadTickets(), [loadTickets]);

  const sourceTickets = (remoteTickets ?? []).filter(t => !mine || Boolean(actorId) && (t.creatorId === actorId || t.assigneeIds.includes(actorId)));
  const filtered = useMemo(() => sourceTickets.filter((ticket) => `${ticket.title} ${ticketDisplayId(ticket.id)}`.toLowerCase().includes(query.toLowerCase()) && (status === 'Todos' || ticket.status === status)), [query, sourceTickets, status]);

  return <><PageHeader eyebrow="Atendimento" title={mine ? "Meus Chamados" : "Chamados"} description="Acompanhe solicitações, responsáveis e o andamento dos fluxos." actions={<Button onClick={() => navigate('/chamados/novo')}><Plus size={16} /> Novo chamado</Button>} />
    {mine && !actorId && <div className="info-callout">Selecione o operador no menu lateral.</div>}
    <div className="metric-grid"><div className="metric"><span>Em andamento</span><strong>{sourceTickets.filter(t => t.status === "Em andamento").length}</strong><small>Chamados em andamento</small></div><div className="metric"><span>Aguardando decisão</span><strong>{sourceTickets.filter(t => t.status === "Aguardando").length}</strong><small>Requerem atenção</small></div><div className="metric"><span>Concluídos</span><strong>{sourceTickets.filter(t => t.status === "Concluído").length}</strong><small>Chamados concluídos</small></div></div>
    <section className="surface"><div className="toolbar"><div className="search"><Search size={16} /><Input aria-label="Buscar chamados" placeholder="Buscar por título ou código..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="toolbar-actions"><Select aria-label="Filtrar status" value={status} onChange={(event) => setStatus(event.target.value)}><option>Todos</option><option>Rascunho</option><option>Aberto</option><option>Em andamento</option><option>Aguardando</option><option>Concluído</option></Select><Button variant="secondary" onClick={() => { setQuery(""); setStatus("Todos"); }}>Limpar filtros</Button></div></div>
      {apiError && <div className="info-callout api-fallback-notice" role="alert"><span>{apiError}</span><Button type="button" variant="secondary" onClick={loadTickets}><RefreshCw size={15} /> Tentar novamente</Button></div>}
      <div className="table-scroll"><table><thead><tr><th>Chamado</th><th>Status</th><th>Responsável</th><th>Estrutura</th><th>Atualização</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="table-state" role="status"><span className="loading-indicator" aria-hidden="true" /> Carregando chamados...</td></tr> : filtered.length ? filtered.map((ticket) => <tr key={ticket.id} onClick={() => navigate(`/chamados/${ticket.id}`)}><td><div className="ticket-cell"><span className="ticket-icon"><TicketIcon size={17} /></span><span><strong>{ticket.title}</strong><small>{ticketDisplayId(ticket.id)}</small></span></div></td><td><Badge tone={ticket.status === 'Concluído' ? 'green' : ticket.status === 'Em andamento' ? 'blue' : 'neutral'}>{ticket.status}</Badge></td><td>{ticket.assigneeIds.length ? (userName(ticket.assigneeIds[0]) !== 'Não definido' ? userName(ticket.assigneeIds[0]) : ticketAssigneeName(ticket.assigneeIds[0])) : <span className="muted">Não definido</span>}</td><td>{ticket.flows.length} fluxos · {ticket.flows.reduce((sum, flow) => sum + flow.stages.length, 0)} etapas</td><td>{ticket.createdAt}</td><td><Link to={`/chamados/${ticket.id}`} aria-label={`Abrir ${ticket.title}`}><ArrowRight size={17} /></Link></td></tr>) : <tr><td colSpan={7} className="table-state">Nenhum chamado encontrado.</td></tr>}</tbody></table></div>
    </section></>;
}
