import { api } from './client';
import type { ListParams, PageResponse } from './types';
import type { Ticket } from '../types';
import { chamadoToTicket, fluxoToFlow, etapaToStage, dependenciaToDependency } from './adapters';
import { editableStageStates, stateEvent } from './stageState';

export async function allPages<T>(list: (params: ListParams) => Promise<PageResponse<T>>): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const result = await list({ Pagina: page, Tamanho: 200 });
    items.push(...result.itens);
    if (items.length >= result.total || result.itens.length === 0) return items;
  }
}

export async function loadTicket(id: string): Promise<Ticket> {
  const [record, flows] = await Promise.all([
    api.chamados.get(id), allPages(p => api.fluxos.list({ ...p, chamadoId: id })),
  ]);
  const ticket = chamadoToTicket(record);
  ticket.flows = await Promise.all(flows.map(async flow => {
    const stages = await allPages(p => api.etapas.list({ ...p, fluxoId: flow.id }));
    return fluxoToFlow(flow, await Promise.all(stages.sort((a,b) => (a.ordemVisual ?? 0) - (b.ordemVisual ?? 0)).map(async stage => {
      const [executions, owners, history] = await Promise.all([
        allPages(p => api.execucoes.list({ ...p, etapaId: stage.id })),
        allPages(p => api.responsaveis.list({ ...p, etapaId: stage.id })),
        allPages(p => api.historicos.etapas.list({ ...p, etapaId: stage.id })),
      ]);
      const model = etapaToStage(stage, executions);
      const latest = model.executions[model.executions.length-1]?.remote;
      for (const event of history.filter(h=>h.tipoEvento===stateEvent).sort((a,b)=>b.criadoEm.localeCompare(a.criadoEm) || Number(b.id)-Number(a.id))) {
        try {
          const data = JSON.parse(event.dadosNovos ?? '{}');
          if (latest && data.executionId===String(latest.id) && data.executionVersion===latest.versao && editableStageStates.includes(data.state)) {model.state=data.state;break;}
        } catch { /* Other clients can write unrelated history formats. */ }
      }
      return { ...model, assigneeIds: owners.filter(x => !x.removidoEm).map(x => String(x.usuarioId)) };
    })));
  }));
  const stageFlows = new Map(ticket.flows.flatMap(f => f.stages.map(s => [s.id, f.id] as const)));
  const dependencies = (await Promise.all([...stageFlows.keys()].map(stageId => allPages(p => api.dependencias.list({ ...p, etapaOrigemId: stageId }))))).flat();
  ticket.dependencies = dependencies.filter(d => stageFlows.has(String(d.etapaDestinoId))).map(d => ({ ...dependenciaToDependency(d), sourceFlowId: stageFlows.get(String(d.etapaOrigemId))!, targetFlowId: stageFlows.get(String(d.etapaDestinoId))! }));
  return ticket;
}

export async function loadTickets(): Promise<Ticket[]> {
  const [tickets, flows, stages] = await Promise.all([allPages(api.chamados.list), allPages(api.fluxos.list), allPages(api.etapas.list)]);
  return tickets.map(record => ({ ...chamadoToTicket(record), flows: flows.filter(f => String(f.chamadoId) === String(record.id)).map(f => fluxoToFlow(f, stages.filter(s => String(s.fluxoId) === String(f.id)).map(s => etapaToStage(s)))) }));
}

export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Não foi possível completar a operação.'; }
