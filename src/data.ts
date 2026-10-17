import type { Dependency, Flow, Stage, Ticket, User } from './types';

export const users: User[] = [
  { id: 'u1', name: 'Marina Costa', email: 'marina@acme.com', role: 'Administrador', active: true, createdAt: '12/01/2025' },
  { id: 'u2', name: 'Rafael Lima', email: 'rafael@acme.com', role: 'Gestor', active: true, createdAt: '18/01/2025' },
  { id: 'u3', name: 'Camila Nunes', email: 'camila@acme.com', role: 'Responsável', active: true, createdAt: '22/01/2025' },
  { id: 'u4', name: 'Diego Alves', email: 'diego@acme.com', role: 'Responsável', active: true, createdAt: '02/02/2025' },
  { id: 'u5', name: 'Beatriz Rocha', email: 'beatriz@acme.com', role: 'Solicitante', active: true, createdAt: '11/02/2025' },
  { id: 'u6', name: 'Lucas Martins', email: 'lucas@acme.com', role: 'Responsável', active: true, createdAt: '19/02/2025' },
  { id: 'u7', name: 'Ana Souza', email: 'ana@acme.com', role: 'Gestor', active: true, createdAt: '04/03/2025' },
  { id: 'u8', name: 'Paulo Reis', email: 'paulo@acme.com', role: 'Solicitante', active: false, createdAt: '10/03/2025' },
];

const stage = (id: string, name: string, state: Stage['state'], assigneeIds: string[], description: string): Stage => ({
  id, name, state, assigneeIds, description, convergence: 'Todas', active: true,
  reprocessing: true, simultaneous: false, maxExecutions: 1,
  executions: state === 'Concluída' ? [{ id: `e-${id}`, stageId: id, startedAt: '14/05/2025 09:30', finishedAt: '14/05/2025 11:20', result: 'Aprovado', status: 'Concluída' }] : [],
});

export const implantationFlows: Flow[] = [
  {
    id: 'f1', name: 'Implantação', description: 'Preparação e entrega do novo ambiente técnico.', status: 'Ativo', active: true,
    createdAt: '14/05/2025', allowChanges: true,
    stages: [
      stage('s1', 'Triagem', 'Concluída', ['u3'], 'Confirmar escopo, urgência e informações de acesso.'),
      stage('s2', 'Análise técnica', 'Concluída', ['u3', 'u4'], 'Avaliar arquitetura e definir plano de implantação.'),
      stage('s3', 'Implementação', 'Em andamento', ['u4', 'u6'], 'Configurar e publicar os componentes do ambiente.'),
      stage('s4', 'Validação', 'Aguardando dependências', ['u2', 'u3'], 'Validar critérios técnicos e documentação.'),
      stage('s5', 'Encerramento', 'Não iniciada', ['u2'], 'Registrar aceite e concluir o atendimento.'),
    ],
  },
  {
    id: 'f2', name: 'Documentação', description: 'Produção e revisão dos documentos de operação.', status: 'Ativo', active: true,
    createdAt: '14/05/2025', allowChanges: true,
    stages: [
      stage('s6', 'Preparar documentação', 'Disponível', ['u6'], 'Documentar configuração e rotinas de suporte.'),
      stage('s7', 'Revisar documentação', 'Não iniciada', ['u3'], 'Revisar clareza e completude das instruções.'),
    ],
  },
];

export const implantationDependencies: Dependency[] = [
  { id: 'd1', sourceFlowId: 'f1', sourceStageId: 's1', targetFlowId: 'f1', targetStageId: 's2', condition: 'Resultado da etapa', expected: 'Aprovado', active: true },
  { id: 'd2', sourceFlowId: 'f1', sourceStageId: 's2', targetFlowId: 'f1', targetStageId: 's3', condition: 'Resultado da etapa', expected: 'Aprovado', active: true },
  { id: 'd3', sourceFlowId: 'f1', sourceStageId: 's3', targetFlowId: 'f1', targetStageId: 's4', condition: 'Regra automática', expected: 'Implantação concluída', active: true },
  { id: 'd4', sourceFlowId: 'f2', sourceStageId: 's7', targetFlowId: 'f1', targetStageId: 's4', condition: 'Resultado da etapa', expected: 'Documento aprovado', active: true },
  { id: 'd5', sourceFlowId: 'f1', sourceStageId: 's4', targetFlowId: 'f1', targetStageId: 's2', condition: 'Escolha manual', expected: 'Requer ajustes', active: true },
  { id: 'd6', sourceFlowId: 'f1', sourceStageId: 's4', targetFlowId: 'f1', targetStageId: 's5', condition: 'Resultado da etapa', expected: 'Aprovado', active: true },
  { id: 'd7', sourceFlowId: 'f2', sourceStageId: 's6', targetFlowId: 'f2', targetStageId: 's7', condition: 'Resultado da etapa', expected: 'Concluído', active: true },
];

export const tickets: Ticket[] = [
  {
    id: 'CH-1048', title: 'Implantação de ambiente técnico', description: 'Provisionar ambiente de homologação para a nova plataforma de atendimento.',
    priority: 'Alta', status: 'Em andamento', category: 'Infraestrutura', createdAt: '14/05/2025', requesterId: 'u5', creatorId: 'u1',
    assigneeIds: ['u2', 'u3'], involvedIds: ['u4', 'u6'], notes: 'Janela preferencial após as 18h.', flows: implantationFlows, dependencies: implantationDependencies,
  },
  { id: 'CH-1047', title: 'Revisão de acesso ao financeiro', description: 'Revisar perfis e permissões.', priority: 'Média', status: 'Aberto', category: 'Acessos', createdAt: '13/05/2025', requesterId: 'u8', creatorId: 'u1', assigneeIds: ['u2'], involvedIds: [], notes: '', flows: [], dependencies: [] },
  { id: 'CH-1046', title: 'Atualização do catálogo de serviços', description: 'Revisar serviços publicados.', priority: 'Baixa', status: 'Rascunho', category: 'Processos', createdAt: '12/05/2025', requesterId: 'u7', creatorId: 'u7', assigneeIds: [], involvedIds: [], notes: '', flows: [{ id: 'f3', name: 'Revisão editorial', description: 'Fluxo ainda em preparação.', status: 'Rascunho', stages: [], active: true, createdAt: '12/05/2025', allowChanges: true }], dependencies: [] },
  { id: 'CH-1045', title: 'Liberação de integração ERP', description: 'Homologar integração contábil.', priority: 'Crítica', status: 'Aguardando', category: 'Integrações', createdAt: '10/05/2025', requesterId: 'u5', creatorId: 'u1', assigneeIds: ['u4'], involvedIds: ['u3'], notes: '', flows: [implantationFlows[0]], dependencies: implantationDependencies.slice(0, 3) },
  { id: 'CH-1044', title: 'Renovação de certificados', description: 'Renovar certificados de produção.', priority: 'Alta', status: 'Concluído', category: 'Segurança', createdAt: '08/05/2025', requesterId: 'u8', creatorId: 'u2', assigneeIds: ['u6'], involvedIds: [], notes: '', flows: [implantationFlows[0]], dependencies: implantationDependencies.slice(0, 3) },
];

export const userName = (id: string) => users.find((user) => user.id === id)?.name ?? 'Não definido';
