import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Edit3 } from 'lucide-react';
import { api } from '../api';
import { errorMessage } from '../api/resources';
import { useDirectory } from '../app/Directory';
import { Badge, Button, Field, Input, Select, Toggle } from '../components/ui';
import { PageHeader } from '../components/layout';

export function UsersPage() {
  const { users, types } = useDirectory();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  return <><PageHeader title="Usuários" description="Pessoas cadastradas na central de atendimento." actions={<Button onClick={() => navigate('/usuarios/novo')}><Plus size={16}/> Novo usuário</Button>}/>
    <section className="surface"><div className="toolbar"><Input aria-label="Buscar usuários" placeholder="Buscar nome ou e-mail..." value={query} onChange={e => setQuery(e.target.value)}/></div>
    <div className="table-scroll"><table><thead><tr><th>Usuário</th><th>Tipo</th><th>Situação</th><th/></tr></thead><tbody>{users.filter(u => (u.nome + ' ' + u.email).toLowerCase().includes(query.toLowerCase())).map(u => <tr key={u.id}><td><strong>{u.nome}</strong><p>{u.email}</p></td><td>{types.find(t => t.id === u.usuarioTipoId)?.nome ?? u.usuarioTipoId}</td><td><Badge tone={u.ativo ? 'green' : 'neutral'}>{u.ativo ? 'Ativo' : 'Inativo'}</Badge></td><td><Button variant="ghost" onClick={() => navigate('/usuarios/' + u.id + '/editar')}><Edit3 size={15}/> Editar</Button></td></tr>)}</tbody></table>{users.length === 0 && <p className="empty-inline">Nenhum usuário cadastrado.</p>}</div></section></>;
}

export function UserForm() {
  const { id } = useParams();
  const { types, reload } = useDirectory();
  const navigate = useNavigate();
  const [form, setForm] = useState({nome:'', email:'', usuarioTipoId:0, ativo:true});
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!id);

  useEffect(() => {
    let active = true;

    if (!id) { setForm({nome:'',email:'',usuarioTipoId:0,ativo:true}); setLoaded(true); setLoading(false);

 return; }

    setLoading(true); setLoaded(false);
    api.usuarios.get(id).then(u => { if(active) {setForm(u);setLoaded(true);} }).catch(e => {if(active) setError(errorMessage(e));}).finally(() => {if(active) setLoading(false);});

    return () => {active=false;};
  }, [id]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if(saving || !loaded) return;
    setSaving(true);setError('');
    try {
      const body = {nome:form.nome.trim(),email:form.email.trim(),usuarioTipoId:form.usuarioTipoId,ativo:form.ativo};
      const saved = id ? await api.usuarios.update(id,body) : await api.usuarios.create(body);

      if(!id) navigate('/usuarios/' + saved.id + '/editar', {replace:true});
      await reload(); navigate('/usuarios');
    } catch(e) {setError(errorMessage(e));} finally {setSaving(false);}
  }

  return <><PageHeader title={id ? 'Editar usuário' : 'Novo usuário'} description="Identificação e situação do usuário."/>{error && <div role="alert" className="info-callout">{error}</div>}{loading ? <p role="status">Carregando...</p> : <form className="form-section user-form" onSubmit={save}><fieldset disabled={saving || !loaded} className="form-grid" style={{border:0,margin:0}}>
    <Field label="Nome completo"><Input required maxLength={150} value={form.nome} onChange={e => setForm({...form,nome:e.target.value})}/></Field>
    <Field label="E-mail"><Input required type="email" maxLength={255} value={form.email} onChange={e => setForm({...form,email:e.target.value})}/></Field>
    <Field label="Tipo"><Select required value={form.usuarioTipoId || ''} onChange={e => setForm({...form,usuarioTipoId:Number(e.target.value)})}><option value="">Selecione...</option>{types.filter(t=>t.ativo || t.id===form.usuarioTipoId).map(t=><option key={t.id} value={t.id}>{t.nome}</option>)}</Select></Field>
    <Toggle label="Usuário ativo" checked={form.ativo} onChange={ativo=>setForm({...form,ativo})}/><div className="form-actions"><Button type="button" variant="secondary" onClick={()=>navigate('/usuarios')}>Cancelar</Button><Button type="submit">{saving ? 'Salvando...' : 'Salvar usuário'}</Button></div>
  </fieldset></form>}</>;
}
