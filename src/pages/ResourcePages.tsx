import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { allPages, errorMessage } from '../api/resources';
import type { ChamadoFluxo, ChamadoFluxoEtapa, ChamadoFluxoHistorico } from '../api/types';
import { useDirectory } from '../app/Directory';
import { PageHeader } from '../components/layout';
import { Button, Field, Input, Modal, Toggle } from '../components/ui';

export function FlowsPage() {
  const [flows,setFlows]=useState<ChamadoFluxo[]>([]);
  const [stages,setStages]=useState<ChamadoFluxoEtapa[]>([]);
  const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [attempt,setAttempt]=useState(0);

  useEffect(()=>{let active=true;

setLoading(true);setError('');Promise.all([allPages(api.fluxos.list),allPages(api.etapas.list)]).then(([f,s])=>{if(active){setFlows(f);setStages(s);}}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});

return()=>{active=false;};},[attempt]);

  return <><PageHeader title="Fluxos e Etapas" description="Estruturas cadastradas nos chamados."/>{error&&<div className="info-callout" role="alert">{error}<Button onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</Button></div>}<section className="surface"><div className="table-scroll"><table><thead><tr><th>Fluxo</th><th>Chamado</th><th>Etapas</th><th/></tr></thead><tbody>{flows.map(f=><tr key={f.id}><td><strong>{f.nome}</strong><p>{f.descricao}</p></td><td>CH-{f.chamadoId}</td><td>{stages.filter(s=>String(s.fluxoId)===String(f.id)).length}</td><td><Link to={'/chamados/'+f.chamadoId+'/fluxos/'+f.id}>Abrir fluxo</Link></td></tr>)}</tbody></table>{loading?<p className="empty-inline" role="status">Carregando...</p>:!flows.length&&<p className="empty-inline">Nenhum fluxo cadastrado.</p>}</div></section></>;
}

export function HistoryPage() {
  const {userName}=useDirectory();
  const [records,setRecords]=useState<(ChamadoFluxoHistorico&{key:string;scope:string})[]>([]);
  const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [attempt,setAttempt]=useState(0);

  useEffect(()=>{let active=true;

setLoading(true);setError('');Promise.all([allPages(api.historicos.fluxos.list),allPages(api.historicos.etapas.list)]).then(([f,s])=>{if(active)setRecords([...f.map(r=>({...r,key:'f'+r.id,scope:'Fluxo #'+r.fluxoId})),...s.map(r=>({...r,key:'s'+r.id,scope:'Etapa #'+r.etapaId}))].sort((a,b)=>b.criadoEm.localeCompare(a.criadoEm)));}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});

return()=>{active=false;};},[attempt]);

  return <><PageHeader title="Histórico" description="Eventos registrados em fluxos e etapas."/>{error&&<div className="info-callout" role="alert">{error}<Button onClick={()=>setAttempt(x=>x+1)}>Tentar novamente</Button></div>}<section className="surface"><div className="table-scroll"><table><thead><tr><th>Registro</th><th>Evento</th><th>Data</th><th>Autor</th></tr></thead><tbody>{records.map(r=><tr key={r.key}><td>{r.scope}</td><td>{r.tipoEvento}<p>{r.motivo}</p></td><td>{new Date(r.criadoEm).toLocaleString('pt-BR')}</td><td>{userName(r.criadoPor?String(r.criadoPor):'')}</td></tr>)}</tbody></table>{loading?<p className="empty-inline" role="status">Carregando...</p>:!records.length&&<p className="empty-inline">Nenhum evento registrado.</p>}</div></section></>;
}

export function SettingsPage() {
  const {types,reload}=useDirectory();
  const [draft,setDraft]=useState<{id?:number;nome:string;descricao:string;ativo:boolean}|null>(null);
  const [saving,setSaving]=useState(false);const [error,setError]=useState('');

  async function save(e:React.FormEvent){e.preventDefault();if(!draft||saving)return;setSaving(true);setError('');try{const record=draft.id?await api.tiposUsuario.update(draft.id,draft):await api.tiposUsuario.create(draft);

setDraft({...record,descricao:record.descricao??''});await reload();setDraft(null);}catch(e){setError(errorMessage(e));}finally{setSaving(false);}}

  return <><PageHeader title="Configurações" description="Tipos de usuário cadastrados." actions={<Button onClick={()=>{setError('');setDraft({nome:'',descricao:'',ativo:true});}}>Novo tipo</Button>}/><section className="surface"><div className="table-scroll"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Situação</th><th/></tr></thead><tbody>{types.map(t=><tr key={t.id}><td>{t.nome}</td><td>{t.descricao}</td><td>{t.ativo?'Ativo':'Inativo'}</td><td><Button variant="ghost" onClick={()=>{setError('');setDraft({...t,descricao:t.descricao??''});}}>Editar</Button></td></tr>)}</tbody></table></div></section>
  {draft&&<Modal title={draft.id?'Editar tipo':'Novo tipo'} onClose={()=>{if(!saving)setDraft(null);}}><form className="modal-body" onSubmit={save}>{error&&<p role="alert">{error}</p>}<Field label="Nome"><Input required disabled={saving} maxLength={80} value={draft.nome} onChange={e=>setDraft({...draft,nome:e.target.value})}/></Field><Field label="Descrição"><Input disabled={saving} maxLength={300} value={draft.descricao} onChange={e=>setDraft({...draft,descricao:e.target.value})}/></Field><Toggle checked={draft.ativo} onChange={ativo=>{if(!saving)setDraft({...draft,ativo});}} label="Tipo ativo"/><Button disabled={saving} type="submit">{saving?'Salvando...':'Salvar'}</Button></form></Modal>}</>;
}
