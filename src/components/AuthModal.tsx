import { useState } from 'react';
import { authApi, authStorage } from '../api';
import { Button, Field, Input } from './ui';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login({ email, password });
      setCurrentUser(res);
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    authApi.logout();
    setCurrentUser(null);
    window.location.reload();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h3>{currentUser ? 'Sessão Autenticada' : 'Autenticação da API'}</h3>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '1.25rem' }}>
          {currentUser ? (
            <div>
              <p style={{ marginBottom: '1rem', color: '#16a34a' }}>
                ✓ Conectado como <strong>{currentUser.email}</strong>
              </p>
              <Button variant="danger" onClick={handleLogout} style={{ width: '100%' }}>
                Desconectar / Limpar Token
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Conecte-se com seu login para autorizar chamadas às rotas e hubs da API.
              </p>
              {error && <div className="info-callout" role="alert" style={{ color: '#ef4444' }}>{error}</div>}
              <Field label="E-mail">
                <Input
                  type="email"
                  required
                  placeholder="usuario@exemplo.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Field label="Senha">
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={loading}
                />
              </Field>
              <Button type="submit" disabled={loading} style={{ width: '100%' }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

