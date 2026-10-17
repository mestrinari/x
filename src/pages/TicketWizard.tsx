import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ChevronDown, ChevronRight, Copy, GitBranch, List, Network, Plus, RotateCcw, Save, Trash2, UserPlus, Workflow } from 'lucide-react';
import { useDirectory } from '../app/Directory';
import { loadTicket, errorMessage } from '../api/resources';
import { saveTicket } from '../api/saveTicket';
import { editableStageStates } from '../api/stageState';
import type { Dependency, Flow, Stage, Ticket } from '../types';
import { Badge, Button, Chip, Field, Input, Modal, Select, Textarea, Toggle } from '../components/ui';
import { PageHeader } from '../components/layout';
import { FlowCanvas } from '../components/FlowCanvas';

const tabs = ['Dados do Chamado', 'Pessoas', 'Fluxos', 'Etapas', 'Regras e Dependências', 'Revisão e Criação'];
const blankTicket: Ticket = { id: 'novo', title: '', description: '', priority: 'Média', status: 'Aberto', category: '', createdAt: new Date().toLocaleDateString('pt-BR'), requesterId: '', creatorId: '', assigneeIds: [], involvedIds: [], notes: '', flows: [], dependencies: [] };
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

export function TicketWizard() {
  const { id } = useParams();
  const { actorId } = useDirectory();
  const existing = Boolean(id);
  const [ticket, setTicket] = useState<Ticket>(() => clone({ ...blankTicket, creatorId: actorId }));
  const [activeTab, setActiveTab] = useState(0);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(Boolean(id && !id.startsWith('CH-')));
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();
  const update = (patch: Partial<Ticket>) => setTicket((current) => ({ ...current, ...patch }));
  const completed = [Boolean(ticket.title && ticket.description), Boolean(ticket.creatorId), true, true, true, Boolean(ticket.title)];

  useEffect(() => {
    let active = true;
    setApiError(null);
    setSaved(false);
    if (!id) { setTicket(clone({ ...blankTicket, creatorId: actorId })); setLoading(false); return; }
    setLoading(true);
    loadTicket(id).then(value => { if (active) setTicket(value); }).catch(e => { if (active) setApiError(errorMessage(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  useEffect(() => { if (!id && actorId) setTicket(current => current.creatorId ? current : {...current,creatorId:actorId}); }, [actorId,id]);

  const save = async (final = false) => {
    if (saving || loading) return;
    if (!ticket.title.trim()) { setActiveTab(0); return; }
    setSaving(true); setSaved(false); setApiError(null);
    try {
      const result = await saveTicket({ ...ticket, status: final || ticket.remote ? ticket.status : 'Rascunho' }, actorId, setTicket);
      setSaved(true);
      if (final) navigate('/chamados/' + result.id);
      else if (!id) navigate('/chamados/' + result.id + '/editar', { replace: true });
    } catch (e) { setApiError(errorMessage(e) + ' As partes já salvas foram mantidas. Em conflito de versão, recarregue o chamado.'); }
    finally { setSaving(false); }
  };
  if (loading) return <div className="empty-state" role="status">Carregando chamado...</div>;
  if (id && !ticket.remote) return <div className="empty-state" role="alert"><p>{apiError || 'Chamado não encontrado.'}</p><Button onClick={() => window.location.reload()}>Tentar novamente</Button></div>;

  return <div className="wizard-page">
    <PageHeader eyebrow={`Chamados / ${existing ? ticket.id : 'Novo'}`} title={existing ? 'Editar chamado' : 'Novo chamado'} description={existing ? 'Altere dados e configurações sem afetar o histórico já registrado.' : 'Comece com o essencial. Fluxos e etapas podem ser configurados agora ou depois.'} actions={<><Button variant="secondary" onClick={() => navigate('/chamados')}><ArrowLeft size={16} /> Cancelar</Button><Button disabled={saving || !actorId} variant="secondary" onClick={() => save(false)}><Save size={16} /> {ticket.remote ? 'Salvar' : 'Salvar rascunho'}</Button></>} />
    {loading && <div className="info-callout detail-api-state" role="status"><span className="loading-indicator" aria-hidden="true" /> Carregando dados do chamado...</div>}
    {apiError && <div className="info-callout detail-api-state" role="alert"><AlertTriangle size={18} /><span>{apiError}</span></div>}
    {!actorId && <div className="info-callout">Selecione o operador no menu lateral para salvar.</div>}
    {saved && <div className="toast"><CheckCircle2 size={18} /> Alterações salvas com sucesso.</div>}
    <div className="internal-tabs" role="tablist">{tabs.map((tab, index) => <button key={tab} role="tab" aria-selected={activeTab === index} className={`${activeTab === index ? 'active' : ''} ${completed[index] ? 'complete' : ''}`} onClick={() => setActiveTab(index)}><span>{completed[index] ? <Check size={13} /> : index + 1}</span>{tab}</button>)}</div>
    <fieldset className="wizard-content" disabled={saving} style={{border:0,padding:0,margin:0,minWidth:0}}>
      {activeTab === 0 && <GeneralTab ticket={ticket} update={update} />}
      {activeTab === 1 && <PeopleTab ticket={ticket} update={update} />}
      {activeTab === 2 && <FlowsTab ticket={ticket} update={update} onContinue={() => setActiveTab(3)} />}
      {activeTab === 3 && <StagesTab ticket={ticket} update={update} />}
      {activeTab === 4 && <DependenciesTab ticket={ticket} update={update} />}
      {activeTab === 5 && <ReviewTab ticket={ticket} onEdit={setActiveTab} />}
    </fieldset>
    <div className="wizard-footer"><span>Etapa {activeTab + 1} de {tabs.length} <small>Você pode navegar livremente entre as etapas.</small></span><div>{activeTab > 0 && <Button disabled={saving} variant="secondary" onClick={() => setActiveTab(activeTab - 1)}>Voltar</Button>}{activeTab < tabs.length - 1 ? <Button disabled={saving} onClick={() => setActiveTab(activeTab + 1)}>Continuar <ChevronRight size={16} /></Button> : <Button disabled={saving || loading || !actorId} onClick={() => save(true)}><CheckCircle2 size={16} /> {saving ? 'Salvando...' : existing ? 'Salvar alterações' : 'Criar chamado'}</Button>}</div></div>
  </div>;
}

function GeneralTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  return <section className="form-section"><div className="section-heading"><h2>Dados do chamado</h2></div><div className="form-grid">
    <Field label="Título do chamado"><Input required maxLength={200} value={ticket.title} onChange={e => update({title:e.target.value})} /></Field>
    <Field label="Descrição detalhada"><Textarea value={ticket.description} onChange={e => update({description:e.target.value})} /></Field>
    <Field label="Status"><Select value={ticket.status} onChange={e => update({status:e.target.value})}>{['Rascunho','Aberto','Em andamento','Aguardando','Concluído'].map(s => <option key={s}>{s}</option>)}</Select></Field>
    <div className="split-fields"><Field label="Data de criação"><Input readOnly value={ticket.createdAt} /></Field><Field label="Identificador"><Input readOnly value={ticket.id === 'novo' ? 'Gerado ao salvar' : ticket.id} /></Field></div>
  </div></section>;
}

function MultiUser({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (ids: string[]) => void; hint?: string }) {
  const { users: records, types, userName } = useDirectory();
  const users = records.map(u => ({id:String(u.id), name:u.nome, active:u.ativo, role:types.find(t => t.id === u.usuarioTipoId)?.nome ?? ''}));
  const [selected, setSelected] = useState('');
  return <Field label={label} hint={hint}><div className="multi-select"><div className="chips">{value.map((id) => <Chip key={id} onRemove={() => onChange(value.filter((item) => item !== id))}>{userName(id)}</Chip>)}</div><div className="select-add"><Select value={selected} onChange={(e) => setSelected(e.target.value)}><option value="">Selecione uma pessoa</option>{users.filter((user) => user.active && !value.includes(user.id)).map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</Select><Button type="button" variant="secondary" disabled={!selected} onClick={() => { onChange([...value, selected]); setSelected(''); }}><UserPlus size={16} /> Adicionar</Button></div></div></Field>;
}

function PeopleTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  const { users } = useDirectory();
  return <section className="form-section"><div className="section-heading"><h2>Pessoas</h2></div><div className="form-grid">
    <Field label="Usuário criador"><Select disabled={Boolean(ticket.remote)} value={ticket.creatorId} onChange={e => update({creatorId:e.target.value})}><option value="">Selecione...</option>{users.filter(u => u.ativo || String(u.id) === ticket.creatorId).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}</Select></Field>
    <Field label="Responsável geral"><Select value={ticket.assigneeIds[0] ?? ''} onChange={e => update({assigneeIds:e.target.value ? [e.target.value] : []})}><option value="">Sem responsável</option>{users.filter(u => u.ativo || ticket.assigneeIds.includes(String(u.id))).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}</Select></Field>
  </div></section>;
}

function FlowsTab({ ticket, update, onContinue }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void; onContinue: () => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [initialStatus, setInitialStatus] = useState<Flow['status']>('Rascunho');
  const add = () => { if (!name) return; update({ flows: [...ticket.flows, { id: `f-${Date.now()}`, name, description: '', status: initialStatus, stages: [], active: true, createdAt: new Date().toLocaleDateString('pt-BR'), allowChanges: true }] }); setName(''); setCreating(false); };
  if (!ticket.flows.length && !creating) return <div className="empty-state"><span className="empty-icon"><Workflow size={26} /></span><h2>Este chamado ainda não possui fluxos</h2><p>Os fluxos são opcionais. Você pode criar o chamado normalmente ou organizar o atendimento em etapas personalizadas.</p><div><Button onClick={() => setCreating(true)}><Plus size={16} /> Criar primeiro fluxo</Button><Button variant="secondary" onClick={onContinue}>Continuar sem fluxo</Button></div><small>Um fluxo vazio também é válido. Você pode adicionar etapas depois.</small></div>;
  return <section className="form-section"><div className="section-heading with-action"><div><h2>Fluxos do chamado</h2><p>Organize diferentes frentes de trabalho sem exigir uma estrutura fixa.</p></div><Button onClick={() => setCreating(true)}><Plus size={16} /> Novo fluxo</Button></div>
    {creating && <div className="inline-creator"><Field label="Nome do fluxo"><Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aprovação técnica" /></Field><Field label="Situação inicial"><Select value={initialStatus} onChange={e => setInitialStatus(e.target.value as Flow["status"])}><option>Rascunho</option><option>Ativo</option></Select></Field><div className="inline-actions"><Button variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button><Button onClick={add}>Criar fluxo vazio</Button></div></div>}
    <div className="flow-list">{ticket.flows.map((flow) => <div className={`flow-row ${!flow.active ? 'deleted' : ''}`} key={flow.id}><span className="flow-symbol"><GitBranch size={18} /></span><div><Input aria-label="Nome do fluxo" maxLength={150} value={flow.name} onChange={e=>update({flows:ticket.flows.map(f=>f.id===flow.id?{...f,name:e.target.value}:f)})}/><Input aria-label="Descrição do fluxo" maxLength={1000} value={flow.description} onChange={e=>update({flows:ticket.flows.map(f=>f.id===flow.id?{...f,description:e.target.value}:f)})}/><small>Criado em {flow.createdAt}</small></div><div className="flow-stats"><span><strong>{flow.stages.length}</strong> etapas</span><span><strong>{flow.stages.filter((stage) => stage.active).length}</strong> ativas</span><span><strong>{new Set(flow.stages.flatMap((stage) => stage.assigneeIds)).size}</strong> responsáveis</span></div><Badge tone={flow.active ? 'green' : 'red'}>{flow.active ? flow.status : 'Excluído'}</Badge><div className="row-actions"><Button variant="ghost" onClick={() => update({flows:[...ticket.flows, { ...flow, id:crypto.randomUUID(), remote:undefined, name:flow.name + " (cópia)", stages:flow.stages.map(s => ({...s,id:crypto.randomUUID(),remote:undefined,executions:[],state:"Não iniciada",operationalStateDirty:true,pendingOperationalExecution:undefined})) }]})}><Copy size={15} /> Duplicar</Button><Button variant="ghost" onClick={() => update({ flows: ticket.flows.map((item) => item.id === flow.id ? { ...item, active: !item.active } : item) })}>{flow.active ? <><Trash2 size={15} /> Excluir</> : <><RotateCcw size={15} /> Restaurar</>}</Button></div></div>)}</div>
  </section>;
}

function StagesTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  const activeFlows = ticket.flows.filter((flow) => flow.active);
  const [flowId, setFlowId] = useState(activeFlows[0]?.id ?? '');
  const flow = ticket.flows.find((item) => item.id === flowId);
  const [stageId, setStageId] = useState(flow?.stages[0]?.id ?? '');
  const selected = ticket.flows.flatMap((item) => item.stages).find((stage) => stage.id === stageId);
  const setFlow = (next: Flow) => update({ flows: ticket.flows.map((item) => item.id === next.id ? next : item) });
  const addStage = () => { if (!flow) return; const newStage: Stage = { id: `s-${Date.now()}`, name: 'Nova etapa', description: 'Descreva o objetivo desta etapa.', assigneeIds: [], state: 'Não iniciada', operationalStateDirty: true, convergence: 'Todas', active: true, reprocessing: false, simultaneous: false, maxExecutions: 1, executions: [] }; setFlow({ ...flow, stages: [...flow.stages, newStage] }); setStageId(newStage.id); };
  useEffect(() => { if (flow && !flow.stages.some(s => s.id === stageId)) setStageId(flow.stages[0]?.id ?? ""); if (!activeFlows.some(f=>f.id===flowId)) setFlowId(activeFlows[0]?.id ?? ""); }, [ticket.flows,flowId,stageId]);
  const updateStage = (patch: Partial<Stage>) => { if (!selected || !flow) return; setFlow({ ...flow, stages: flow.stages.map((stage) => stage.id === selected.id ? { ...stage, ...patch } : stage) }); };
  if (!activeFlows.length) return <div className="empty-state small"><span className="empty-icon"><GitBranch size={25} /></span><h2>Crie um fluxo antes de adicionar etapas</h2><p>Volte à aba Fluxos. O fluxo pode ser criado vazio e configurado gradualmente.</p></div>;
  return <div className="stage-workspace"><section className="stage-list-panel"><div className="panel-header"><div><h2>Etapas</h2><p>Selecione uma etapa para configurar.</p></div><Button onClick={addStage}><Plus size={15} /> Nova etapa</Button></div><Select value={flowId} onChange={(e) => { setFlowId(e.target.value); setStageId(ticket.flows.find((f) => f.id === e.target.value)?.stages[0]?.id ?? ''); }}>{activeFlows.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.stages.length} etapas</option>)}</Select><div className="stage-list">{flow?.stages.map((stage, index) => <button key={stage.id} className={`stage-list-item ${stage.id === stageId ? 'active' : ''} ${!stage.active ? 'deleted' : ''}`} onClick={() => setStageId(stage.id)}><span className="step-number">{index + 1}</span><span><strong>{stage.name}</strong><small>{stage.assigneeIds.length ? `${stage.assigneeIds.length} responsáveis` : 'Sem responsável'} · {ticket.dependencies.filter((dep) => dep.targetStageId === stage.id).length} dependências</small></span><Badge tone={stage.active ? 'blue' : 'red'}>{stage.active ? stage.state : 'Excluída'}</Badge></button>)}</div></section>
    <section className="stage-editor">{selected ? <><div className="panel-header"><div><span className="eyebrow">{flow?.name}</span><h2>Configurar etapa</h2></div><div className="row-actions"><Button variant="ghost" onClick={() => flow && setFlow({ ...flow, stages: [...flow.stages, { ...selected, remote: undefined, id: `s-${Date.now()}`, name: `${selected.name} (cópia)`, state: "Não iniciada", operationalStateDirty: true, pendingOperationalExecution: undefined, executions: [] }] })}><Copy size={15} /> Duplicar</Button><Button variant="ghost" onClick={() => updateStage({ active: !selected.active })}>{selected.active ? <Trash2 size={15} /> : <RotateCcw size={15} />}{selected.active ? 'Excluir' : 'Restaurar'}</Button></div></div>{selected.executions.length > 0 && <div className="history-note"><CheckCircle2 size={16} /> Esta etapa possui {selected.executions.length} execução histórica. As alterações não apagam resultados anteriores.</div>}<div className="editor-sections">
      <details open><summary><span><strong>Informações da etapa</strong><small>Nome, descrição e estado administrativo</small></span><ChevronDown size={18} /></summary><div className="details-content"><div className="split-fields"><Field label="Status administrativo" hint="Códigos 0, 1 e 2 definidos pelo contrato da API."><Select value={selected.administrativeStatus ?? selected.remote?.statusAdministrativo ?? 0} onChange={e=>updateStage({administrativeStatus:Number(e.target.value)})}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></Select></Field><Field label="Ordem visual"><Input type="number" step={1} min={-2147483648} max={2147483647} value={selected.visualOrder ?? ""} onChange={e=>updateStage({visualOrder:e.target.value === "" ? null : Number(e.target.value)})}/></Field></div><Field label="Nome da etapa"><Input maxLength={150} value={selected.name} onChange={(e) => updateStage({ name: e.target.value })} /></Field><Field label="Descrição detalhada"><Textarea value={selected.description} onChange={(e) => updateStage({ description: e.target.value })} /></Field><div className="split-fields"><Field label="Disponibilidade do registro"><Select value={selected.active ? 'Ativa' : 'Excluída'} onChange={(e) => updateStage({ active: e.target.value === 'Ativa' })}><option>Ativa</option><option>Excluída</option></Select></Field><Field label="Estado operacional" hint="A alteração será aplicada ao salvar o chamado e registrada no histórico."><Select value={selected.state} onChange={(e) => updateStage({ state: e.target.value as Stage["state"], operationalStateDirty: true, pendingOperationalExecution: undefined })}>{editableStageStates.map(state=><option key={state}>{state}</option>)}</Select></Field></div></div></details>
      <details open><summary><span><strong>Responsáveis</strong><small>Pessoas atribuídas à etapa</small></span><ChevronDown size={18} /></summary><div className="details-content"><MultiUser label="Responsáveis da etapa" value={selected.assigneeIds} onChange={(assigneeIds) => updateStage({ assigneeIds })} /></div></details>
      <details><summary><span><strong>Convergência e execuções</strong><small>Dependências, reprocessamento e opções avançadas</small></span><ChevronDown size={18} /></summary><div className="details-content"><Field label="Modo de convergência"><Select value={selected.convergence} onChange={(e) => updateStage({ convergence: e.target.value as Stage['convergence'] })}><option>Todas</option><option>Qualquer</option></Select></Field><p className="field-help">Modo de convergência registrado para a etapa. A API atual não libera etapas automaticamente.</p><div className="split-fields"><Toggle checked={selected.manualCompletion ?? selected.remote?.exigirConclusaoManual ?? true} onChange={manualCompletion=>updateStage({manualCompletion})} label="Exigir conclusão manual" hint="Grava a exigência de conclusão manual da etapa."/><Toggle checked={selected.simultaneous} onChange={(simultaneous) => updateStage({ simultaneous })} label="Execuções simultâneas" hint="Permite trabalho paralelo nesta etapa." /></div></div></details>
    </div></> : <div className="empty-editor">Selecione ou crie uma etapa para começar.</div>}</section></div>;
}

function DependenciesTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const allStages = ticket.flows.filter(flow => flow.active).flatMap((flow) => flow.stages.filter(stage => stage.active).map((stage) => ({ stage, flow })));
  const [draft, setDraft] = useState<Partial<Dependency>>({ condition: 'Resultado da etapa', expected: 'Concluído' });
  const stageName = (id?: string) => allStages.find((item) => item.stage.id === id);
  const add = () => {
    const source = stageName(draft.sourceStageId), target = stageName(draft.targetStageId);
    if (!source || !target || source.stage.id === target.stage.id) return;
    const previous = ticket.dependencies.find(d=>d.id===editingId);
    const dependency: Dependency = { ...previous, id:editingId ?? crypto.randomUUID(), sourceFlowId:source.flow.id,sourceStageId:source.stage.id,targetFlowId:target.flow.id,targetStageId:target.stage.id,condition:draft.condition??'Resultado da etapa',expected:draft.expected??'',active:true };
    update({dependencies:editingId ? ticket.dependencies.map(d=>d.id===editingId?dependency:d) : [...ticket.dependencies,dependency]});
    setCreating(false);
  };
  return <section className="form-section dependency-section"><div className="section-heading with-action"><div><h2>Regras e dependências</h2><p>Conecte etapas do mesmo fluxo ou de fluxos diferentes.</p></div><div className="segmented"><button className={mode === 'list' ? 'active' : ''} onClick={() => setMode('list')}><List size={15} /> Lista</button><button className={mode === 'map' ? 'active' : ''} onClick={() => setMode('map')}><Network size={15} /> Mapa</button></div><Button onClick={() => {setEditingId(null);setDraft({condition:"Resultado da etapa",expected:"APROVADO"});setCreating(true);}}><Plus size={15} /> Nova dependência</Button></div>
    {mode === 'map' ? <><div className="map-notice"><GitBranch size={16} /> Arraste os nós para organizar a visualização. Ciclos são permitidos e aparecem como retornos.</div><FlowCanvas flows={ticket.flows} dependencies={ticket.dependencies} editing /></> : <div className="dependency-list">{ticket.dependencies.length ? ticket.dependencies.map((dependency) => { const source = stageName(dependency.sourceStageId); const target = stageName(dependency.targetStageId); return <div className={`dependency-row ${!dependency.active ? 'deleted' : ''}`} key={dependency.id}><div><small>ORIGEM · {source?.flow.name}</small><strong>{source?.stage.name}</strong></div><span className="dependency-arrow"><ChevronRight size={18} /></span><div><small>DESTINO · {target?.flow.name}</small><strong>{target?.stage.name}</strong></div><div><Badge tone="purple">{dependency.condition}</Badge><small>Se: {dependency.expected}</small><Button variant="ghost" onClick={()=>{setEditingId(dependency.id);setDraft(dependency);setCreating(true);}}>Editar condição</Button></div><Button variant="ghost" onClick={() => update({ dependencies: ticket.dependencies.map((item) => item.id === dependency.id ? { ...item, active: !item.active } : item) })}>{dependency.active ? <Trash2 size={15} /> : <RotateCcw size={15} />}{dependency.active ? 'Excluir' : 'Restaurar'}</Button></div>; }) : <div className="empty-inline">Nenhuma dependência configurada. Etapas independentes são válidas.</div>}</div>}
    {creating && <Modal title={editingId ? "Editar dependência" : "Nova dependência"} onClose={() => setCreating(false)}><div className="modal-body"><p className="modal-intro">Escolha a origem, o destino e a condição necessária. Não é permitido código executável.</p><div className="split-fields"><Field label="Etapa de origem"><Select disabled={Boolean(ticket.dependencies.find(d=>d.id===editingId)?.remote)} value={draft.sourceStageId ?? ''} onChange={(e) => setDraft({ ...draft, sourceStageId: e.target.value })}><option value="">Selecione...</option>{allStages.map(({ flow, stage }) => <option key={stage.id} value={stage.id}>{flow.name} · {stage.name}</option>)}</Select></Field><Field label="Etapa de destino"><Select disabled={Boolean(ticket.dependencies.find(d=>d.id===editingId)?.remote)} value={draft.targetStageId ?? ''} onChange={(e) => setDraft({ ...draft, targetStageId: e.target.value })}><option value="">Selecione...</option>{allStages.map(({ flow, stage }) => <option key={stage.id} value={stage.id}>{flow.name} · {stage.name}</option>)}</Select></Field></div><Field label="Tipo de condição"><Select value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value as Dependency['condition'] })}><option>Conclusão da etapa</option><option>Resultado da etapa</option><option>Escolha manual</option><option>Regra automática</option></Select></Field><Field label="Resultado ou critério esperado" hint={draft.condition === "Regra automática" ? "Informe um objeto JSON válido." : undefined}><Input value={draft.expected} onChange={(e) => setDraft({ ...draft, expected: e.target.value })} /></Field><div className="modal-actions"><Button variant="secondary" onClick={() => setCreating(false)}>Cancelar</Button><Button disabled={!draft.sourceStageId || !draft.targetStageId || draft.sourceStageId === draft.targetStageId} onClick={add}>Salvar dependência</Button></div></div></Modal>}
  </section>;
}

function ReviewTab({ ticket, onEdit }: { ticket: Ticket; onEdit: (tab: number) => void }) {
  const { userName } = useDirectory();
  const [preview, setPreview] = useState<'map' | 'list'>('map');
  const stageCount = useMemo(() => ticket.flows.reduce((sum, flow) => sum + flow.stages.length, 0), [ticket.flows]);
  return <div className="review-layout"><section className="review-main"><div className="review-block"><div className="review-title"><div><h2>Resumo do chamado</h2><p>Revise os dados antes de criar.</p></div><Button variant="ghost" onClick={() => onEdit(0)}>Editar</Button></div><dl><div><dt>Título</dt><dd>{ticket.title || 'Não informado'}</dd></div><div><dt>Criador</dt><dd>{userName(ticket.creatorId)}</dd></div><div><dt>Status</dt><dd>{ticket.status}</dd></div><div><dt>Responsável</dt><dd>{userName(ticket.assigneeIds[0] ?? "")}</dd></div><div className="wide"><dt>Descrição</dt><dd>{ticket.description || 'Não informada'}</dd></div></dl></div>
    <div className="review-block"><div className="review-title"><div><h2>Pré-visualização operacional</h2><p>É assim que a equipe acompanhará o trabalho.</p></div><div className="segmented"><button className={preview === 'map' ? 'active' : ''} onClick={() => setPreview('map')}><Network size={15} /> Mapa</button><button className={preview === 'list' ? 'active' : ''} onClick={() => setPreview('list')}><List size={15} /> Lista</button></div></div>{preview === 'map' ? ticket.flows.length ? <FlowCanvas flows={ticket.flows} dependencies={ticket.dependencies} /> : <div className="empty-inline">Este chamado será criado sem fluxos.</div> : <div className="preview-list">{ticket.flows.flatMap((flow) => flow.stages.map((stage) => <div key={stage.id}><span><strong>{stage.name}</strong><small>{flow.name}</small></span><Badge tone="blue">{stage.state}</Badge></div>))}</div>}</div></section>
    <aside className="review-aside"><h3>Estrutura configurada</h3><div className="summary-number"><strong>{ticket.flows.length}</strong><span>fluxos</span></div><div className="summary-number"><strong>{stageCount}</strong><span>etapas</span></div><div className="summary-number"><strong>{ticket.dependencies.length}</strong><span>dependências</span></div><hr /><p>{ticket.flows.filter((flow) => !flow.stages.length).length} fluxos vazios</p><p>{ticket.flows.flatMap((flow) => flow.stages).filter((stage) => stage.assigneeIds.length).length} etapas com responsáveis</p><div className="ready-box"><CheckCircle2 size={18} /><span><strong>Pronto para criar</strong><small>Você poderá editar tudo depois.</small></span></div></aside></div>;
}
