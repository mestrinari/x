import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Offline contract test; never writes to the real database.
globalThis.window = { location: { origin: 'http://localhost' }, setTimeout, clearTimeout };
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
const originalFetch = globalThis.fetch;
const calls = [];
const version = 'AQIDBAUGBwg=';
globalThis.fetch = async (input, options) => {
  const url = new URL(input);
  calls.push({ url, options });
  if (options.method === 'GET') {
    let itens;
    if (url.pathname === '/api/usuarios') itens = [{ id: 7, nome: 'Ána', ativo: true }];
    else if (url.pathname === '/api/mencoes-etapas') {
      assert.equal(url.searchParams.get('etapaId'), '10');
      itens = [{ id: 1, mensagemId: 2, usuarioId: 7 }];
    } else {
      assert.equal(url.pathname, '/api/mensagens-etapas');
      assert.equal(url.searchParams.get('etapaId'), '10');
      const page = Number(url.searchParams.get('pagina'));
      itens = [{ id: page, etapaId: 10, usuarioId: 7, mensagemPaiId: null, conteudo: 'Texto', criadoEm: '2026-10-17T12:00:00Z', versao: version }];
      return Response.json({ itens, total: 2, pagina: page, tamanho: 1 });
    }
    return Response.json({ itens, total: itens.length, pagina: 1, tamanho: 200 });
  }
  return options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({});
};
try {
  const { etapaMensagensApi: api } = await server.ssrLoadModule('/src/etapa-mensagens/api.ts');
  const signal = new AbortController().signal;
  const messages = await api.listar('10', signal);
  assert.equal(messages.length, 2);
  assert.equal(messages[1].usuarioNome, 'Ána');
  assert.equal(messages[1].versao, version);
  assert.equal(messages[1].mencoes[0].usuarioId, 7);
  assert.equal(messages[1].mencoes[0].inicio, -1);
  assert.equal((await api.usuarios('ana', signal)).length, 1);
  const mention = { usuarioId: 7, nome: 'Ána', inicio: 0, fim: 4 };
  const payload = { conteudo: '@Ána', mensagemPaiId: '1', mencoes: [mention, mention] };
  await api.criar('10', 7, payload);
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { etapaId: '10', usuarioId: 7, conteudo: '@Ána', mensagemPaiId: '1', mencoesUsuarioIds: [7] });
  await api.editar('2', version, payload);
  assert.equal(JSON.parse(calls.at(-1).options.body).versao, version);
  assert.equal(calls.at(-1).url.pathname, '/api/mensagens-etapas/2');
  await api.excluir('2', 7, version);
  assert.deepEqual(JSON.parse(calls.at(-1).options.body), { usuarioId: 7, versao: version });
  globalThis.fetch = async () => Response.json({ detail: 'Conflito de versão' }, { status: 409 });
  await assert.rejects(() => api.editar('2', version, payload), /Conflito de versão/);
  console.log('Mensagens: paginação, autores, menções, payloads, rowversion e conflitos verificados.');
} finally {
  globalThis.fetch = originalFetch;
  await server.close();
}
