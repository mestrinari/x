import { http } from "../api/http";
import type { ApiId, PageResponse } from "../api/types";
import type { EtapaMensagensApi, MensagemEtapa, UsuarioMencao } from "./EtapaMensagens";

type MensagemRegistro = Omit<MensagemEtapa, "usuarioNome" | "mencoes">;

type MencaoRegistro = { id: ApiId; mensagemId: ApiId; usuarioId: number };

async function listarPaginas<T>(path: string, query: Record<string, ApiId>, signal: AbortSignal): Promise<T[]> {
  const itens: T[] = [];

  for (let pagina = 1; ; pagina++) {
    const result = await http.get<PageResponse<T>>(path, { query: { ...query, pagina, tamanho: 200 }, signal });

    itens.push(...result.itens);
    if (itens.length >= result.total || result.itens.length === 0) return itens;
  }
}

const byId = (id: ApiId) => `/api/mensagens-etapas/${encodeURIComponent(id)}`;

export const etapaMensagensApi: EtapaMensagensApi = {
  async listar(etapaId, signal) {
    const [mensagens, usuarios, mencoes] = await Promise.all([
      listarPaginas<MensagemRegistro>("/api/mensagens-etapas", { etapaId }, signal),
      listarPaginas<UsuarioMencao>("/api/usuarios", {}, signal),
      listarPaginas<MencaoRegistro>("/api/mencoes-etapas", { etapaId }, signal),
    ]);
    const nomes = new Map(usuarios.map(u => [u.id, u.nome]));
    const porMensagem = new Map<string, MensagemEtapa["mencoes"]>();

    for (const mencao of mencoes) {
      const key = String(mencao.mensagemId);
      const lista = porMensagem.get(key) ?? [];

      // O banco armazena destinatários, não offsets no texto.
      lista.push({ usuarioId: mencao.usuarioId, nome: nomes.get(mencao.usuarioId) ?? `Usuário #${mencao.usuarioId}`, inicio: -1, fim: -1 });
      porMensagem.set(key, lista);
    }

    return mensagens.map(m => ({
      ...m,
      id: String(m.id),
      etapaId: String(m.etapaId),
      mensagemPaiId: m.mensagemPaiId == null ? null : String(m.mensagemPaiId),
      usuarioNome: nomes.get(m.usuarioId) ?? `Usuário #${m.usuarioId}`,
      mencoes: porMensagem.get(String(m.id)) ?? [],
    }));
  },
  async usuarios(busca, signal) {
    const usuarios = await listarPaginas<UsuarioMencao>("/api/usuarios", { ativo: "true" }, signal);
    const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

    return usuarios.filter(u => u.ativo && normalizar(u.nome).includes(normalizar(busca)));
  },
  async criar(etapaId, usuarioId, payload) {
    await http.post<MensagemRegistro>("/api/mensagens-etapas", {
      etapaId, usuarioId, conteudo: payload.conteudo, mensagemPaiId: payload.mensagemPaiId,
      mencoesUsuarioIds: [...new Set(payload.mencoes.map(m => m.usuarioId))],
    });
  },
  async editar(mensagemId, versao, payload) {
    await http.put<MensagemRegistro>(byId(mensagemId), {
      conteudo: payload.conteudo, versao,
      mencoesUsuarioIds: [...new Set(payload.mencoes.map(m => m.usuarioId))],
    });
  },
  excluir: (mensagemId, usuarioId, versao) => http.delete<void>(byId(mensagemId), { usuarioId, versao }),
};
