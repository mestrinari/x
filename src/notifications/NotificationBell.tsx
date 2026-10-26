import { useState } from 'react';
import { Bell, CheckCheck, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useNotifications } from './NotificationProvider';
import './notifications.css';

export function NotificationBell() {
  const { items, unread, connected, loading, error, hasMore, loadMore, refresh, read, readAll, archive } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const openNotification = async (id: number, url: string | null) => {
    if (!await read(id)) return;
    setOpen(false);
    if (url && /^\/chamados\/\d+(\?|$)/.test(url)) navigate(url);
  };

  return <div className="notifications-root">
    <button type="button" className="notifications-bell" onClick={() => setOpen(value => !value)} aria-label={`Notificações: ${unread} não lidas`} aria-expanded={open}>
      <Bell size={19}/>{unread > 0 && <span className="notifications-count">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <section className="notifications-panel" aria-label="Notificações">
      <header><strong>Notificações</strong><span title={connected ? 'Tempo real conectado' : 'Modo de sincronização HTTP'} className={connected ? 'notifications-online' : 'notifications-offline'}>{connected ? 'Ao vivo' : 'Reconectando'}</span></header>
      <div className="notifications-actions">
        <button onClick={() => void readAll()} disabled={!unread}><CheckCheck size={14}/> Marcar todas como lidas</button>
        <button onClick={() => void refresh()} disabled={loading} aria-label="Atualizar notificações"><RefreshCw size={15}/></button>
      </div>
      {error && <p role="alert" className="notifications-error">{error}</p>}
      <div className="notifications-list">
        {loading && <p role="status">Carregando notificações...</p>}
        {!loading && !items.length && <p className="notifications-empty">Nenhuma notificação encontrada.</p>}
        {items.map(item => <div key={item.id} className={`notifications-item ${!item.lidaEm ? 'unread' : ''}`}>
          <button className="notifications-open" onClick={() => void openNotification(item.id, item.urlDestino)}>
            <strong>{item.titulo}</strong><span>{item.conteudo}</span>
            <small>{new Date(item.criadoEm).toLocaleString('pt-BR')}</small>
          </button>
          <button className="notifications-archive" onClick={() => void archive(item.id)} aria-label={`Arquivar ${item.titulo}`}><X size={15}/></button>
        </div>)}
        {hasMore && <button disabled={loading} onClick={() => void loadMore()}>Carregar mais</button>}
      </div>
    </section>}
  </div>;
}
