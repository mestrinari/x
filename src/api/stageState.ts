import { api } from './client';
import { execucaoToExecution } from './adapters';
import type { Stage, StageState } from '../types';

export const editableStageStates: StageState[] = ['Não iniciada', 'Disponível', 'Em andamento', 'Concluída', 'Aguardando dependências', 'Aguardando decisão', 'Invalidada', 'Cancelada'];
export const stateEvent = 'ESTADO_OPERACIONAL_ALTERADO';

// The API has six execution codes, but the editor has eight operational labels.
// Store the exact label as a version-bound history event, never in the execution result.
export async function saveStageState(stage: Stage, actor: number, checkpoint: () => void) {
  if (!stage.operationalStateDirty) return;
  if (!editableStageStates.includes(stage.state)) throw new Error('Estado operacional inválido.');
  const latest = [...stage.executions].sort((a,b)=>(b.remoteNumber??0)-(a.remoteNumber??0))[0]?.remote;
  let execution = stage.pendingOperationalExecution;
  if (!execution) {
    const status = stage.state === 'Em andamento' ? 1 : stage.state === 'Concluída' ? 2 : stage.state === 'Invalidada' ? 3 : stage.state === 'Cancelada' ? 5 : 0;
    const terminal = latest && [2,3,4,5].includes(latest.status);
    const now = new Date().toISOString();
    const base = latest && !terminal ? latest : undefined;
    const body = {
      ...base, status, validadeResultado: status===2 ? 1 : status===3 ? 2 : 0,
      iniciadoEm: status===1 || status===2 ? base?.iniciadoEm ?? now : null,
      iniciadoPor: status===1 || status===2 ? base?.iniciadoPor ?? actor : null,
      concluidoEm: status===2 ? now : null, concluidoPor:status===2 ? actor : null,
      resultado:base?.resultado ?? null,
    };
    execution = base
      ? await api.execucoes.update(base.id,{...body,versao:base.versao})
      : await api.execucoes.create({...body,etapaId:stage.id,numeroExecucao:Math.max(0,...stage.executions.map(e=>e.remoteNumber??0))+1,execucaoAnteriorId:latest?.id ?? null,motivoReprocessamento:latest?'Alteração manual do estado operacional':null});
    stage.executions = [...stage.executions.filter(e=>e.id!==String(execution!.id)),execucaoToExecution(execution,stage.id)];
    stage.pendingOperationalExecution=execution;
    checkpoint();
  }
  await api.historicos.etapas.create({etapaId:stage.id,tipoEvento:stateEvent,entidadeRelacionadaId:execution.id,criadoPor:actor,dadosNovos:JSON.stringify({state:stage.state,executionId:String(execution.id),executionVersion:execution.versao})});
  stage.operationalStateDirty=false;
  stage.pendingOperationalExecution=undefined;
  checkpoint();
}
