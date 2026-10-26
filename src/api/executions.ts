import { api } from './client';
import type { Stage } from '../types';

export async function executeStage(stage: Stage, action: 'start'|'finish'|'reopen', actorId: string, result = '') {
  if (!Number.isInteger(Number(actorId)) || Number(actorId)<1) throw new Error('Selecione o operador.');
  const latest = [...stage.executions].sort((a,b)=>(b.remoteNumber??0)-(a.remoteNumber??0))[0]?.remote;

  if(action==='finish') {
    const running=[...stage.executions].reverse().find(e=>e.remote?.status===1)?.remote;

    if(!running) throw new Error('Não há execução em andamento. Atualize o chamado.');
    if(!result.trim()) throw new Error('Informe o resultado da etapa.');

    return api.execucoes.update(running.id,{...running,status:2,validadeResultado:1,concluidoEm:new Date().toISOString(),concluidoPor:Number(actorId),resultado:result.trim(),versao:running.versao});
  }

  const pending=action==='start' ? stage.executions.find(e=>e.remote?.status===0)?.remote : undefined;

  if(pending) return api.execucoes.update(pending.id,{...pending,status:1,iniciadoEm:new Date().toISOString(),iniciadoPor:Number(actorId),versao:pending.versao});

  return api.execucoes.create({etapaId:stage.id,numeroExecucao:Math.max(0,...stage.executions.map(e=>e.remoteNumber??0))+1,status:1,validadeResultado:0,iniciadoEm:new Date().toISOString(),iniciadoPor:Number(actorId),execucaoAnteriorId:action==='reopen'?latest?.id:null,motivoReprocessamento:action==='reopen'?'Reabertura solicitada pelo operador':null});
}
