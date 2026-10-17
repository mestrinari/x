// Opt-in integration check: creates a labelled local fixture and soft-deletes its editable resources.
import assert from 'node:assert/strict';
import { createServer } from 'vite';

if (process.env.RUN_LOCAL_API_CHECK !== '1') throw new Error('Set RUN_LOCAL_API_CHECK=1 to test the local development API.');
globalThis.window = { location: { origin: 'http://localhost:8443' }, setTimeout, clearTimeout };
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const { api } = await server.ssrLoadModule('/src/api/client.ts');
const { loadTicket, allPages } = await server.ssrLoadModule('/src/api/resources.ts');
const { saveTicket } = await server.ssrLoadModule('/src/api/saveTicket.ts');
const { executeStage } = await server.ssrLoadModule('/src/api/executions.ts');
const users = await allPages(api.usuarios.list);
const actor = String(users.filter(u=>u.ativo).sort((a,b)=>a.id-b.id)[0]?.id ?? '');
assert.ok(actor, 'An existing active user is required');
const stage=(id,name)=>({id,name,description:'Fixture de integração',assigneeIds:[actor],state:'Não iniciada',convergence:'Todas',active:true,reprocessing:true,simultaneous:false,maxExecutions:1,executions:[]});
let current={id:'novo',title:'[TESTE INTEGRAÇÃO] '+new Date().toISOString(),description:'Fixture temporária do front',priority:'Média',status:'Rascunho',category:'',createdAt:'',requesterId:'',creatorId:actor,assigneeIds:[actor],involvedIds:[],notes:'',flows:[
  {id:'f-a',name:'Fluxo A',description:'',status:'Rascunho',active:true,createdAt:'',allowChanges:true,stages:[stage('s-a','Etapa A')]},
  {id:'f-b',name:'Fluxo B',description:'',status:'Rascunho',active:true,createdAt:'',allowChanges:true,stages:[stage('s-b','Etapa B')]},
],dependencies:[{id:'d-a',sourceFlowId:'f-a',sourceStageId:'s-a',targetFlowId:'f-b',targetStageId:'s-b',condition:'Resultado da etapa',expected:'APROVADO',active:true}]};
const checkpoint=t=>{current=t;};
try {
  const pages=await allPages(async p=>({itens:p.Pagina===1?[1,2]:[3],total:3,pagina:p.Pagina,tamanho:2}));
  assert.deepEqual(pages,[1,2,3]);
  // Force a failure after root/flow writes, then retry using checkpointed IDs.
  const createStage=api.etapas.create;
  api.etapas.create=async()=>{throw new Error('Simulated interruption');};
  try {await assert.rejects(()=>saveTicket(current,actor,checkpoint),/Simulated interruption/);} finally {api.etapas.create=createStage;}
  const rootId=current.id;
  assert.notEqual(rootId,'novo');
  current=await saveTicket(current,actor,checkpoint);
  assert.equal(current.id,rootId);
  let loaded=await loadTicket(rootId);
  assert.equal(loaded.flows.length,2);
  assert.equal(loaded.flows.flatMap(f=>f.stages).length,2);
  assert.equal(loaded.dependencies.length,1);
  assert.notEqual(loaded.dependencies[0].sourceFlowId,loaded.dependencies[0].targetFlowId);
  assert.deepEqual(loaded.flows[0].stages[0].assigneeIds,[actor]);
  const stale=structuredClone(loaded);
  loaded.title+=' editado';
  current=await saveTicket(loaded,actor,checkpoint);
  await assert.rejects(()=>saveTicket(stale,actor,()=>{}),e=>e.status===409);
  loaded=await loadTicket(rootId);
  const stageId=loaded.flows[0].stages[0].id;
  const find=t=>t.flows.flatMap(f=>f.stages).find(s=>s.id===stageId);
  const first=await executeStage(find(loaded),'start',actor);
  loaded=await loadTicket(rootId);
  const complete=await executeStage(find(loaded),'finish',actor,'APROVADO');
  assert.equal(complete.iniciadoEm,first.iniciadoEm);
  assert.equal(complete.status,2);
  loaded=await loadTicket(rootId);
  const reopened=await executeStage(find(loaded),'reopen',actor);
  assert.notEqual(reopened.id,complete.id);
  assert.equal(String(reopened.execucaoAnteriorId),String(complete.id));
  assert.equal((await api.execucoes.get(complete.id)).resultado,'APROVADO');
  loaded=await loadTicket(rootId);
  assert.equal(find(loaded).state,'Em andamento');
  assert.equal(find(loaded).executions.length,2);
  // Repeated saves retain IDs and update rowversions instead of duplicating children.
  current=await saveTicket(loaded,actor,checkpoint);
  const again=await loadTicket(rootId);
  assert.equal(again.flows.length,2);assert.equal(again.dependencies.length,1);
  // Every editor state must survive save + GET, including labels sharing an execution code.
  const { editableStageStates } = await server.ssrLoadModule('/src/api/stageState.ts');
  for (const state of editableStageStates) {
    const draft=await loadTicket(rootId);
    const selected=find(draft);
    selected.state=state; selected.operationalStateDirty=true;
    selected.visualOrder=7; selected.administrativeStatus=1;
    selected.manualCompletion=false;selected.simultaneous=true;
    current=await saveTicket(draft,actor,checkpoint);
    const roundtrip=find(await loadTicket(rootId));
    assert.equal(roundtrip.state,state);
    assert.equal(roundtrip.visualOrder,7);
    assert.equal(roundtrip.administrativeStatus,1);
    assert.equal(roundtrip.manualCompletion,false);
    assert.equal(roundtrip.simultaneous,true);
  }
  // A later execution action supersedes the old version-bound manual state.
  const operational=await loadTicket(rootId);
  find(operational).state='Em andamento';find(operational).operationalStateDirty=true;
  current=await saveTicket(operational,actor,checkpoint);
  await executeStage(find(await loadTicket(rootId)),'finish',actor,'VALIDADO');
  assert.equal(find(await loadTicket(rootId)).state,'Concluída');
  assert.equal((await api.execucoes.get(complete.id)).resultado,'APROVADO');
  console.log('PASS: all eight operational states round-trip, administrative fields, visual order, manual completion, simultaneous execution and historical preservation.');
  console.log('PASS: pagination, partial-save retry, nested persistence, owners, cross-flow dependencies, 409 conflict, execution completion, preserved history and repeat saves. Fixture '+rootId);
} finally {
  try {
    if(current.remote) {
      const latest=await loadTicket(current.id);
      for(const d of latest.dependencies) await api.dependencias.remove(d.id,{versao:d.remote.versao,usuarioId:Number(actor)});
      for(const f of latest.flows) {
        for(const s of f.stages) {
          for(const owner of await allPages(p=>api.responsaveis.list({...p,etapaId:s.id}))) if(!owner.removidoEm) await api.responsaveis.remove(owner.id,{usuarioId:Number(actor)});
          await api.etapas.remove(s.id,{versao:s.remote.versao,usuarioId:Number(actor)});
        }
        await api.fluxos.remove(f.id,{versao:f.remote.versao,usuarioId:Number(actor)});
      }
      await api.chamados.remove(latest.id,{versao:latest.remote.versao,usuarioId:Number(actor)});
      console.log('Fixture soft-deleted. Execution audit records remain attached to its deleted stages, as required by the API.');
    }
  } finally {await server.close();}
}
