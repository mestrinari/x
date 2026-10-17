import type { Chamado, ChamadoFluxo, ChamadoFluxoEtapa, ChamadoFluxoEtapaDependencia, ChamadoFluxoEtapaExecucao } from './api/types';
export type UserRole = string;
export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Crítica';
export type StageState =
  | 'Não iniciada'
  | 'Disponível'
  | 'Em andamento'
  | 'Concluída'
  | 'Aguardando dependências'
  | 'Aguardando decisão'
  | 'Invalidada'
  | 'Cancelada'
  | 'Excluída';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Execution {
  remote?: ChamadoFluxoEtapaExecucao;
  id: string;
  stageId: string;
  startedAt: string;
  finishedAt?: string;
  result?: string;
  status: 'Não iniciada' | 'Em andamento' | 'Concluída' | 'Invalidada' | 'Cancelada';
  remoteNumber?: number;
  remoteVersion?: string;
  remoteStatus?: number;
}

export interface Stage {
  operationalStateDirty?: boolean;
  pendingOperationalExecution?: ChamadoFluxoEtapaExecucao;
  visualOrder?: number | null;
  administrativeStatus?: number;
  manualCompletion?: boolean;
  remote?: ChamadoFluxoEtapa;
  id: string;
  name: string;
  description: string;
  assigneeIds: string[];
  state: StageState;
  convergence: 'Todas' | 'Qualquer';
  active: boolean;
  reprocessing: boolean;
  simultaneous: boolean;
  maxExecutions: number;
  executions: Execution[];
}

export interface Flow {
  remote?: ChamadoFluxo;
  id: string;
  name: string;
  description: string;
  status: 'Rascunho' | 'Ativo' | 'Arquivado';
  stages: Stage[];
  active: boolean;
  createdAt: string;
  allowChanges: boolean;
}

export interface Dependency {
  remote?: ChamadoFluxoEtapaDependencia;
  id: string;
  sourceFlowId: string;
  sourceStageId: string;
  targetFlowId: string;
  targetStageId: string;
  condition: 'Conclusão da etapa' | 'Resultado da etapa' | 'Escolha manual' | 'Regra automática' | 'Combinação';
  expected: string;
  active: boolean;
}

export interface Ticket {
  remote?: Chamado;
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: string;
  category: string;
  createdAt: string;
  requesterId: string;
  creatorId: string;
  assigneeIds: string[];
  involvedIds: string[];
  notes: string;
  flows: Flow[];
  dependencies: Dependency[];
  remoteVersion?: string;
}
