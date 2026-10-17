import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import { allPages, errorMessage } from '../api/resources';
import type { Usuario, UsuarioTipo } from '../api/types';

const Context = createContext<{
  users: Usuario[]; types: UsuarioTipo[]; actorId: string; setActorId: (id: string) => void;
  userName: (id: string) => string; reload: () => Promise<void>;
} | null>(null);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [types, setTypes] = useState<UsuarioTipo[]>([]);
  const [actorId, setActor] = useState(() => localStorage.getItem('orbit.operator') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  async function reload() {
    try {
      const [people, roles] = await Promise.all([allPages(api.usuarios.list), allPages(api.tiposUsuario.list)]);
      setUsers(people); setTypes(roles); setError('');
    } catch (e) { setError(errorMessage(e)); throw e; }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload().catch(() => {}); }, []);
  const validActor = users.some(u => String(u.id) === actorId && u.ativo) ? actorId : '';
  return <Context.Provider value={{ users, types, actorId: validActor, setActorId: id => { setActor(id); localStorage.setItem('orbit.operator', id); }, userName: id => users.find(u => String(u.id) === id)?.nome ?? (id ? `Usuário #${id}` : 'Não definido'), reload }}>
    {loading ? <div className="empty-state" role="status">Carregando usuários...</div> : error ? <div className="empty-state" role="alert"><p>{error}</p><button onClick={() => { setLoading(true); void reload().catch(() => {}); }}>Tentar novamente</button></div> : children}
  </Context.Provider>;
}
export function useDirectory() {
  const value = useContext(Context);
  if (!value) throw new Error('DirectoryProvider não encontrado');
  return value;
}
