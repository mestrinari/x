import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '../api';
import { allPages, errorMessage } from '../api/resources';
import { getCustomApiUrl, setCustomApiUrl } from '../api/config';
import type { Usuario, UsuarioTipo } from '../api/types';
import { AlertTriangle, RefreshCw } from 'lucide-react';

const Context = createContext<{
  users: Usuario[];
  types: UsuarioTipo[];
  actorId: string;
  setActorId: (id: string) => void;
  userName: (id: string) => string;
  reload: () => Promise<void>;
  apiError: string;
} | null>(null);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [types, setTypes] = useState<UsuarioTipo[]>([]);
  const [actorId, setActor] = useState(() => localStorage.getItem('orbit.operator') ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const [people, roles] = await Promise.all([
        allPages(api.usuarios.list),
        allPages(api.tiposUsuario.list),
      ]);
      setUsers(people);
      setTypes(roles);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  const validActor = users.some(u => String(u.id) === actorId && u.ativo) ? actorId : '';
  const customUrl = getCustomApiUrl();

  return (
    <Context.Provider
      value={{
        users,
        types,
        actorId: validActor,
        setActorId: id => {
          setActor(id);
          localStorage.setItem('orbit.operator', id);
        },
        userName: id => users.find(u => String(u.id) === id)?.nome ?? (id ? `Usuário #${id}` : 'Não definido'),
        reload,
        apiError: error,
      }}
    >
      {/* Banner de aviso caso a API esteja inacessível, sem sumir com a aplicação */}
      {error && (
        <aside
          role="alert"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 9999,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderBottom: '1px solid #f87171',
            padding: '0.625rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.875rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <AlertTriangle size={18} />
            <span>
              <strong>Falha de conexão com a API:</strong> {error}
              {customUrl && (
                <span> (URL configurada: <code>{customUrl}</code>)</span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => void reload()}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '0.25rem',
                backgroundColor: '#ffffff',
                border: '1px solid #f87171',
                color: '#991b1b',
                fontWeight: 500,
              }}
            >
              <RefreshCw size={14} /> Tentar reconectar
            </button>
            {customUrl && (
              <button
                type="button"
                onClick={() => {
                  setCustomApiUrl('');
                  window.location.reload();
                }}
                style={{
                  cursor: 'pointer',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '0.25rem',
                  backgroundColor: '#b91c1c',
                  border: '1px solid #991b1b',
                  color: '#ffffff',
                  fontWeight: 500,
                }}
              >
                Resetar URL
              </button>
            )}
          </div>
        </aside>
      )}

      {children}
    </Context.Provider>
  );
}

export function useDirectory() {
  const value = useContext(Context);

  if (!value) throw new Error('DirectoryProvider não encontrado');

  return value;
}
