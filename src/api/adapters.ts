import type { Dependency, Flow, Stage, Ticket } from '../types';
import type { Chamado, ChamadoFluxo, ChamadoFluxoEtapa, ChamadoFluxoEtapaDependencia, ChamadoFluxoEtapaExecucao } from './types';

const statusLabels: Record<number, string> = {
  0: 'Rascunho',
  1: 'Aberto',
  2: 'Em andamento',
  3: 'Aguardando',
  4: 'Concluído',
};

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
}

export function chamadoToTicket(chamado: Chamado): Ticket {
  const id = String(chamado.id);
  const assigneeIds = chamado.atribuidoPara === null || chamado.atribuidoPara === undefined
    ? []
    : [String(chamado.atribuidoPara)];

  return {
    remote: chamado,
    id,
    title: chamado.titulo,
    description: chamado.descricao ?? '',
    priority: 'Média',
    status: statusLabels[Number(chamado.status)] ?? `Status ${chamado.status}`,
    category: 'Não categorizado',
    createdAt: formatDate(chamado.criadoEm),
    requesterId: '',
    creatorId: String(chamado.criadoPor),
    assigneeIds,
    involvedIds: [],
    notes: '',
    flows: [],
    dependencies: [],
    remoteVersion: chamado.versao,
  };
}

export function ticketDisplayId(id: string) {
  return id.startsWith('CH-') ? id : `CH-${id}`;
}

export function ticketAssigneeName(id: string) {
  return id.startsWith('u') ? undefined : `Usuário #${id}`;
}

export function fluxoToFlow(fluxo: ChamadoFluxo, stages: Stage[] = []): Flow {
  const status = Number(fluxo.status);

  return {
    remote: fluxo,
    id: String(fluxo.id),
    name: fluxo.nome,
    description: fluxo.descricao ?? '',
    status: status === 2 ? 'Arquivado' : status === 0 ? 'Rascunho' : 'Ativo',
    stages,
    active: fluxo.excluidoEm === null || fluxo.excluidoEm === undefined,
    createdAt: formatDate(fluxo.criadoEm),
    allowChanges: !fluxo.concluidoEm,
  };
}

export function execucaoToExecution(execucao: ChamadoFluxoEtapaExecucao, stageId: string): Stage['executions'][number] {
  const status = Number(execucao.status);
  const executionStatus = status === 2 ? 'Concluída' : status === 1 ? 'Em andamento' : status === 0 ? 'Não iniciada' : status === 5 ? 'Cancelada' : 'Invalidada';

  return {
    remote: execucao,
    id: String(execucao.id),
    stageId,
    startedAt: execucao.iniciadoEm ? formatDate(execucao.iniciadoEm) : 'Não iniciado',
    finishedAt: execucao.concluidoEm ? formatDate(execucao.concluidoEm) : undefined,
    result: execucao.resultado ?? undefined,
    status: executionStatus,
    remoteNumber: Number(execucao.numeroExecucao),
    remoteVersion: execucao.versao,
    remoteStatus: status,
  };
}

export function etapaToStage(etapa: ChamadoFluxoEtapa, execucoes: ChamadoFluxoEtapaExecucao[] = []): Stage {
  const executions = [...execucoes].sort((a, b) => a.numeroExecucao - b.numeroExecucao).map((execucao) => execucaoToExecution(execucao, String(etapa.id)));
  const latestExecution = executions[executions.length - 1];

  return {
    remote: etapa,
    visualOrder: etapa.ordemVisual,
    administrativeStatus: etapa.statusAdministrativo,
    manualCompletion: etapa.exigirConclusaoManual,
    id: String(etapa.id),
    name: etapa.nome,
    description: etapa.descricao ?? '',
    assigneeIds: [],
    state: etapa.excluidoEm ? 'Excluída' : latestExecution?.status === 'Não iniciada' ? 'Disponível' : latestExecution?.status ?? 'Disponível',
    convergence: Number(etapa.modoConvergencia) === 1 ? 'Qualquer' : 'Todas',
    active: !etapa.excluidoEm,
    reprocessing: true,
    simultaneous: etapa.permitirExecucoesSimultaneas,
    maxExecutions: 1,
    executions,
  };
}

function decodeCondition(value: string | null | undefined, type: number): string {
  if (!value) return '';
  if (type === 3) return value;
  try {
    const parsed: unknown = JSON.parse(value);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const field = type === 1 ? obj.resultado : type === 2 ? obj.acao : undefined;

      return typeof field === 'string' ? field : value;
    }
  } catch { return value; }

  return value;
}

export function dependenciaToDependency(dependencia: ChamadoFluxoEtapaDependencia): Dependency {
  const conditions: Dependency['condition'][] = ['Conclusão da etapa', 'Resultado da etapa', 'Escolha manual', 'Regra automática'];

  return {
    remote: dependencia,
    id: String(dependencia.id),
    sourceFlowId: '',
    sourceStageId: String(dependencia.etapaOrigemId),
    targetFlowId: '',
    targetStageId: String(dependencia.etapaDestinoId),
    condition: conditions[Number(dependencia.tipoCondicao)] ?? 'Resultado da etapa',
    expected: decodeCondition(dependencia.configuracaoCondicao, Number(dependencia.tipoCondicao)),
    active: dependencia.excluidoEm === null || dependencia.excluidoEm === undefined,
  };
}
