import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Bell, ChevronDown, CircleHelp, Clock3, Gauge, Menu, PanelLeftClose, Settings, Ticket, Users, Workflow, X } from 'lucide-react';
import { IconButton } from './ui';
import { useDirectory } from '../app/Directory';
import { NotificationBell } from '../notifications/NotificationBell';

const nav = [
  { label: 'Dashboard', path: '/', icon: Gauge },
  { label: 'Chamados', path: '/chamados', icon: Ticket },
  { label: 'Meus Chamados', path: '/meus-chamados', icon: CircleHelp },
  { label: 'Usuários', path: '/usuarios', icon: Users },
  { label: 'Fluxos e Etapas', path: '/fluxos', icon: Workflow },
  { label: 'Histórico', path: '/historico', icon: Clock3 },
  { label: 'Configurações', path: '/configuracoes', icon: Settings },
];

export function AppLayout() {
  const { users, actorId, setActorId } = useDirectory();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-shell">
      {open && <button className="mobile-overlay" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'is-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Workflow size={18} /></span><span><strong>Orbit</strong><small>Service workflow</small></span><IconButton label="Fechar menu" onClick={() => setOpen(false)}><X size={18} /></IconButton></div>
        <nav aria-label="Navegação principal">
          {nav.map((item) => <NavLink key={item.path} to={item.path} end={item.path === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><item.icon size={18} /><span>{item.label}</span></NavLink>)}
        </nav>
        <div className="sidebar-help"><CircleHelp size={18} /><div><strong>Precisa de ajuda?</strong><small>Veja como criar seu primeiro fluxo.</small></div></div>
        <div className="profile"><label style={{width:"100%"}}>Operador<select className="input" aria-label="Operador" value={actorId} onChange={e => setActorId(e.target.value)}><option value="">Selecione seu usuário</option>{users.filter(u => u.ativo).map(u => <option key={u.id} value={String(u.id)}>{u.nome}</option>)}</select></label></div>
      </aside>
      <div className="main-shell">
        <header className="topbar"><IconButton label="Abrir menu" onClick={() => setOpen(true)}><Menu size={20} /></IconButton><div className="topbar-path"><span>Central de atendimento</span><span>/</span><strong>{routeLabel(location.pathname)}</strong></div><div className="topbar-actions"><IconButton label="Recolher navegação"><PanelLeftClose size={18} /></IconButton><NotificationBell /></div></header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  );
}

function routeLabel(path: string) {
  if (path.includes('/novo')) return 'Novo chamado';
  if (path.includes('/editar')) return 'Editar';
  if (path.startsWith('/usuarios')) return 'Usuários';
  if (path.startsWith('/chamados/')) return 'Detalhes do chamado';
  if (path.startsWith('/chamados')) return 'Chamados';

  return nav.find((item) => item.path === path)?.label ?? 'Página';
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: React.ReactNode }) {
  return <div className="page-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
