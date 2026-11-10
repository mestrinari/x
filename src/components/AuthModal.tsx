import { useState } from 'react';
import { authApi, authStorage } from '../api';
import { getCustomApiUrl, setCustomApiUrl } from '../api/config';
import { Button, Field, Input } from './ui';
import { Globe } from 'lucide-react';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [apiUrl, setApiUrl] = useState(() => getCustomApiUrl());
  const [apiUrlSaved, setApiUrlSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(() => authStorage.getUser());

  function handleSaveApiUrl(e: React.FormEvent) {
    e.preventDefault();
    setCustomApiUrl(apiUrl);
    setApiUrlSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }

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
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h3>Conexão e Autenticação</h3>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Seção de URL da API Pública / Backend */}
          <div style={{ borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Globe size={18} style={{ color: 'var(--primary, #2563eb)' }} />
              <strong>URL da API (Backend / Túnel Público)</strong>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.75rem' }}>
              Deixe em branco para usar o proxy local padrão ou insira a URL pública da sua API (ex: Cloudflare Tunnel, Render, Railway, ngrok).
            </p>
            <form onSubmit={handleSaveApiUrl} style={{ display: 'flex', gap: '0.5rem' }}>
              <Input
                type="url"
                placeholder="https://sua-api.trycloudflare.com"
                value={apiUrl}
                onChange={e => {
                  setApiUrl(e.target.value);
                  setApiUrlSaved(false);
                }}
              />
              <Button type="submit" variant="secondary" style={{ whiteSpace: 'nowrap' }}>
                {apiUrlSaved ? 'Salvo!' : 'Aplicar'}
              </Button>
            </form>
            {apiUrl && (
              <small style={{ display: 'block', marginTop: '0.4rem', color: '#059669', fontSize: '0.75rem' }}>
                ● Conectando diretamente em: <code>{apiUrl}</code>
              </small>
            )}
          </div>

          {/* Seção de Login / Token */}
          <div>
            <div style={{ marginBottom: '0.75rem' }}>
              <strong>{currentUser ? 'Sessão Autenticada' : 'Login / Token da API'}</strong>
            </div>

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
                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Informe as credenciais se a sua API exigir autorização Bearer.
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
    </div>
  );
}
