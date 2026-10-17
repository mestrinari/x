import { api } from './client';
import { allPages } from './resources';
import { chamadoToTicket, fluxoToFlow } from './adapters';
import type { Ticket } from '../types';
import { editableStageStates, saveStageState } from './stageState';

const statusCodes: Record<string, number> = { Rascunho: 0, Aberto: 1, 'Em andamento': 2, Aguardando: 3, Concluído: 4 };
const conditions = ['Conclusão da etapa', 'Resultado da etapa', 'Escolha manual', 'Regra automática'];
function conditionJson(value: string, condition: string) {
  if (!value.trim()) return null;
  try { const parsed = JSON.parse(value); if (parsed && typeof parsed === 'object') return value; } catch { /* plain result */ }
  if (condition === 'Conclusão da etapa') return null;
  if (condition === 'Resultado da etapa') return JSON.stringify({ resultado: value });
  if (condition === 'Escolha manual') return JSON.stringify({ acao: value });
  throw new Error('A regra automática precisa de uma configuração JSON válida.');
}

// Each successful request checkpoints server IDs/versions so retrying cannot recreate saved entities.
export async function saveTicket(input: Ticket, actorId: string, checkpoint: (ticket: Ticket) => void): Promise<Ticket> {
  const ticket = structuredClone(input);
  const actor = Number(actorId);
  if (!Number.isInteger(actor) || actor < 1) throw new Error('Selecione o operador no menu lateral antes de salvar.');
  if (!ticket.title.trim()) throw new Error('Informe o título do chamado.');
  if (ticket.title.trim().length > 200) throw new Error('O título pode ter até 200 caracteres.');
  if (!ticket.remote && !Number(ticket.creatorId)) throw new Error('Selecione o usuário criador.');
  if (ticket.assigneeIds.length > 1) throw new Error('A API aceita um responsável geral por chamado.');
  const activeStages = new Set(ticket.flows.filter(f => f.active).flatMap(f => f.stages.filter(s => s.active).map(s => s.id)));
  for (const flow of ticket.flows.filter(f => f.active)) {
    if (!flow.name.trim()) throw new Error('Informe o nome de todos os fluxos.');
    if (flow.name.length > 150 || flow.description.length > 1000) throw new Error('O fluxo aceita nome de até 150 e descrição de até 1000 caracteres.');
    for (const stage of flow.stages.filter(s => s.active)) {
      if (!stage.name.trim() || stage.name.length > 150) throw new Error('Informe nomes de etapas com até 150 caracteres.');
      if (stage.visualOrder != null && (!Number.isInteger(stage.visualOrder) || stage.visualOrder < -2147483648 || stage.visualOrder > 2147483647)) throw new Error('A ordem visual deve ser um número inteiro válido.');
      if (stage.administrativeStatus !== undefined && ![0,1,2].includes(stage.administrativeStatus)) throw new Error('Status administrativo inválido.');
      if (stage.operationalStateDirty && !editableStageStates.includes(stage.state)) throw new Error('Estado operacional inválido.');
    }
  }
  for (const dependency of ticket.dependencies.filter(d => d.active)) {
    if (dependency.sourceStageId === dependency.targetStageId) throw new Error('Uma etapa não pode depender dela mesma.');
    if (!activeStages.has(dependency.sourceStageId) || !activeStages.has(dependency.targetStageId)) throw new Error('Remova as dependências das etapas ou fluxos que serão excluídos.');
    conditionJson(dependency.expected, dependency.condition);
  }
  const commit = () => checkpoint(structuredClone(ticket));
  const unchangedStatus = ticket.remote && chamadoToTicket(ticket.remote).status === ticket.status;
  const body = { titulo: ticket.title.trim(), descricao: ticket.description || null, status: statusCodes[ticket.status] ?? ticket.remote?.status ?? 1, atribuidoPara: ticket.assigneeIds[0] ? Number(ticket.assigneeIds[0]) : null, concluidoEm: unchangedStatus ? ticket.remote?.concluidoEm ?? null : ticket.status === 'Concluído' ? new Date().toISOString() : null };
  const saved = ticket.remote
    ? await api.chamados.update(ticket.id, { ...body, versao: ticket.remote.versao })
    : await api.chamados.create({ ...body, criadoPor: Number(ticket.creatorId) });
  ticket.id = String(saved.id); ticket.remote = saved; ticket.remoteVersion = saved.versao; commit();

  for (const flow of ticket.flows.filter(f => f.active)) {
    const flowBody = { nome: flow.name, descricao: flow.description || null, status: flow.remote && fluxoToFlow(flow.remote).status === flow.status ? flow.remote.status : flow.status === 'Rascunho' ? 0 : flow.status === 'Arquivado' ? 2 : 1, revisaoEstrutural: flow.remote?.revisaoEstrutural ?? 1, permitirExecucoesSimultaneasEtapa: flow.remote?.permitirExecucoesSimultaneasEtapa ?? true, concluidoEm: flow.remote?.concluidoEm ?? null };
    const oldId = flow.id;
    const record = flow.remote ? await api.fluxos.update(flow.id, { ...flowBody, versao: flow.remote.versao }) : await api.fluxos.create({ ...flowBody, chamadoId: ticket.id, criadoPor: actor });
    flow.id = String(record.id); flow.remote = record;
    ticket.dependencies.forEach(d => { if (d.sourceFlowId === oldId) d.sourceFlowId = flow.id; if (d.targetFlowId === oldId) d.targetFlowId = flow.id; });
    commit();
    for (const [order, stage] of flow.stages.entries()) {
      if (!stage.active) continue;
      const stageBody = { nome: stage.name, descricao: stage.description || null, ordemVisual: stage.visualOrder === undefined ? stage.remote?.ordemVisual ?? order : stage.visualOrder, modoConvergencia: stage.convergence === 'Qualquer' ? 1 : 0, statusAdministrativo: stage.administrativeStatus ?? stage.remote?.statusAdministrativo ?? 0, permitirExecucoesSimultaneas: stage.simultaneous, exigirConclusaoManual: stage.manualCompletion ?? stage.remote?.exigirConclusaoManual ?? true };
      const oldStageId = stage.id;
      const result = stage.remote ? await api.etapas.update(stage.id, { ...stageBody, versao: stage.remote.versao }) : await api.etapas.create({ ...stageBody, fluxoId: flow.id, criadoPor: actor });
      stage.id = String(result.id); stage.remote = result;
      ticket.dependencies.forEach(d => { if (d.sourceStageId === oldStageId) d.sourceStageId = stage.id; if (d.targetStageId === oldStageId) d.targetStageId = stage.id; });
      commit();
      const owners = (await allPages(p => api.responsaveis.list({ ...p, etapaId: stage.id }))).filter(x => !x.removidoEm);
      for (const owner of owners.filter(x => !stage.assigneeIds.includes(String(x.usuarioId)))) await api.responsaveis.remove(owner.id, { usuarioId: actor });
      for (const id of stage.assigneeIds.filter(id => !owners.some(x => String(x.usuarioId) === id))) await api.responsaveis.create({ etapaId: stage.id, usuarioId: Number(id), atribuidoPor: actor });
      await saveStageState(stage, actor, commit);
    }
  }
  for (const dependency of [...ticket.dependencies]) {
    if (!dependency.active) {
      if (dependency.remote) await api.dependencias.remove(dependency.id, { versao: dependency.remote.versao, usuarioId: actor });
      ticket.dependencies = ticket.dependencies.filter(d => d.id !== dependency.id); commit(); continue;
    }
    const payload = { tipoCondicao: conditions.indexOf(dependency.condition), configuracaoCondicao: conditionJson(dependency.expected, dependency.condition), ordemAvaliacao: dependency.remote?.ordemAvaliacao ?? 0 };
    const record = dependency.remote ? await api.dependencias.update(dependency.id, { ...payload, versao: dependency.remote.versao }) : await api.dependencias.create({ ...payload, etapaOrigemId: dependency.sourceStageId, etapaDestinoId: dependency.targetStageId, criadoPor: actor });
    dependency.id = String(record.id); dependency.remote = record; commit();
  }
  for (const flow of [...ticket.flows]) {
    for (const stage of [...flow.stages]) {
      if (flow.active && stage.active) continue;
      if (stage.remote) await api.etapas.remove(stage.id, { versao: stage.remote.versao, usuarioId: actor });
      flow.stages = flow.stages.filter(s => s.id !== stage.id); commit();
    }
    if (!flow.active) {
      if (flow.remote) await api.fluxos.remove(flow.id, { versao: flow.remote.versao, usuarioId: actor });
      ticket.flows = ticket.flows.filter(f => f.id !== flow.id); commit();
    }
  }
  return ticket;
}
