"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observarMensagens } from "./realtime";
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Divider, IconButton,
  List, ListItemAvatar, ListItemButton, ListItemText, Menu, MenuItem,
  Paper, Popper, Stack, TextField, Typography,
} from "@mui/material";
import { Trash2 as DeleteOutline, Pencil as EditOutlined, Reply as ReplyOutlined, Send as SendOutlined } from "lucide-react";
import type { ApiId } from "../api/types";

export type UsuarioMencao = { id: number; nome: string; ativo: boolean };

export type Mencao = { usuarioId: number; nome: string; inicio: number; fim: number };

export type MensagemEtapa = {
  id: string;
  etapaId: string;
  usuarioId: number;
  usuarioNome: string;
  mensagemPaiId: string | null;
  conteudo: string;
  mencoes: Mencao[];
  criadoEm: string;
  editadoEm: string | null;
  excluidoEm: string | null;
  versao: string;
};

export type SalvarMensagem = {
  conteudo: string;
  mensagemPaiId: string | null;
  mencoes: Mencao[];
};

export type EtapaMensagensApi = {
  listar: (etapaId: ApiId, signal: AbortSignal) => Promise<MensagemEtapa[]>;
  usuarios: (busca: string, signal: AbortSignal) => Promise<UsuarioMencao[]>;
  criar: (etapaId: ApiId, usuarioId: number, payload: SalvarMensagem) => Promise<void>;
  editar: (mensagemId: string, versao: string, payload: SalvarMensagem) => Promise<void>;
  excluir: (mensagemId: string, usuarioId: number, versao: string) => Promise<void>;
};

type Props = { etapaId: ApiId; usuarioAtualId: number; api: EtapaMensagensApi };

type Sugestao = { inicio: number; fim: number; busca: string };

function localizarMencao(texto: string, cursor: number): Sugestao | null {
  const anterior = texto.slice(0, cursor);
  const match = /(^|\s)@([^@\n\r\s]*)$/.exec(anterior);

  if (!match) return null;
  const inicio = cursor - match[2].length - 1;

  return { inicio, fim: cursor, busca: match[2] };
}

function atualizarMencoes(antigo: string, novo: string, mencoes: Mencao[]): Mencao[] {
  let prefixo = 0;

  while (prefixo < Math.min(antigo.length, novo.length) && antigo[prefixo] === novo[prefixo]) prefixo++;
  let sufixo = 0;

  while (
    sufixo < Math.min(antigo.length - prefixo, novo.length - prefixo) &&
    antigo[antigo.length - sufixo - 1] === novo[novo.length - sufixo - 1]
  ) sufixo++;
  const fimAntigo = antigo.length - sufixo;
  const delta = novo.length - antigo.length;

  return mencoes.flatMap(m => {
    if (m.inicio < 0) return [m];
    if (m.fim <= prefixo) return [m];
    if (m.inicio >= fimAntigo) return [{ ...m, inicio: m.inicio + delta, fim: m.fim + delta }];

    return [];
  });
}

function EditorMensagem({
  usuariosApi, onSalvar, onCancelar, inicial, carregando, placeholder,
}: {
  usuariosApi: EtapaMensagensApi["usuarios"];
  onSalvar: (conteudo: string, mencoes: Mencao[]) => Promise<void>;
  onCancelar?: () => void;
  inicial?: Pick<MensagemEtapa, "conteudo" | "mencoes">;
  carregando: boolean;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(inicial?.conteudo ?? "");
  const [mencoes, setMencoes] = useState<Mencao[]>(inicial?.mencoes ?? []);
  const [sugestao, setSugestao] = useState<Sugestao | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioMencao[]>([]);
  const [indice, setIndice] = useState(0);
  const [erro, setErro] = useState("");
  const campoRef = useRef<HTMLTextAreaElement | null>(null);
  const ancoraRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sugestao) { setUsuarios([]);

 return; }

    const controller = new AbortController();

    usuariosApi(sugestao.busca, controller.signal)
      .then(lista => { if (!controller.signal.aborted) { setUsuarios(lista.filter(u => u.ativo).slice(0, 8)); setIndice(0); } })
      .catch(() => { if (!controller.signal.aborted) setUsuarios([]); });

    return () => controller.abort();
  }, [sugestao?.busca, usuariosApi, sugestao !== null]);

  const alterar = (valor: string, cursor: number) => {
    setMencoes(atualizarMencoes(texto, valor, mencoes));
    setTexto(valor);
    setSugestao(localizarMencao(valor, cursor));
    setIndice(0);
    setErro("");
  };

  const selecionar = (usuario: UsuarioMencao) => {
    if (!sugestao) return;
    const rotulo = `@${usuario.nome}`;
    const novo = texto.slice(0, sugestao.inicio) + rotulo + " " + texto.slice(sugestao.fim);
    const delta = rotulo.length + 1 - (sugestao.fim - sugestao.inicio);
    const preservadas = mencoes.flatMap(m => {
      if (m.fim <= sugestao.inicio) return [m];
      if (m.inicio >= sugestao.fim) return [{ ...m, inicio: m.inicio + delta, fim: m.fim + delta }];

      return [];
    });

    setTexto(novo);
    setMencoes([...preservadas, { usuarioId: usuario.id, nome: usuario.nome, inicio: sugestao.inicio, fim: sugestao.inicio + rotulo.length }].sort((a,b) => a.inicio - b.inicio));
    setSugestao(null);
    setUsuarios([]);
    const proximoCursor = sugestao.inicio + rotulo.length + 1;

    requestAnimationFrame(() => {
      campoRef.current?.focus();
      campoRef.current?.setSelectionRange(proximoCursor, proximoCursor);
    });
  };

  const salvar = async () => {
    if (carregando) return;
    if (!texto.trim()) return setErro("Digite uma mensagem antes de enviar.");
    try {
      setErro("");
      const validas = mencoes.filter(m => m.inicio < 0 || (m.fim <= texto.length && texto.slice(m.inicio, m.fim).startsWith("@")));

      await onSalvar(texto.trim(), validas);
      if (!inicial) { setTexto(""); setMencoes([]); setSugestao(null); }
    } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível salvar a mensagem."); }
  };

  return (
    <Stack spacing={1.2} ref={ancoraRef}>
      <TextField
        inputRef={campoRef}
        multiline minRows={3} maxRows={8} fullWidth size="small"
        placeholder={placeholder ?? "Escreva uma mensagem. Digite @ para mencionar alguém."}
        value={texto} disabled={carregando}
        onChange={e => alterar(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        onClick={e => { const el = e.currentTarget.querySelector("textarea");

 if (el) setSugestao(localizarMencao(texto, el.selectionStart)); }}
        onKeyDown={e => {
          if (sugestao && usuarios.length) {
            if (e.key === "ArrowDown") { e.preventDefault(); setIndice(i => (i + 1) % usuarios.length); }

            if (e.key === "ArrowUp") { e.preventDefault(); setIndice(i => (i - 1 + usuarios.length) % usuarios.length); }

            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); selecionar(usuarios[indice] ?? usuarios[0]); }

            if (e.key === "Escape") setSugestao(null);
          } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void salvar(); }
        }}
        slotProps={{ htmlInput: { "aria-label": "Mensagem da etapa" } }}
      />
      <Popper open={Boolean(sugestao && usuarios.length)} anchorEl={ancoraRef.current} placement="bottom-start" sx={{ zIndex: 1500, width: 340 }}>
        <Paper elevation={6} sx={{ maxHeight: 260, overflow: "auto" }}>
          <List dense disablePadding>
            {usuarios.map((u, i) => <ListItemButton key={u.id} selected={i === indice} onMouseDown={e => e.preventDefault()} onClick={() => selecionar(u)}>
              <ListItemAvatar><Avatar sx={{ width: 30, height: 30 }}>{u.nome[0]}</Avatar></ListItemAvatar>
              <ListItemText primary={u.nome} secondary={`ID ${u.id}`} />
            </ListItemButton>)}
          </List>
        </Paper>
      </Popper>
      {erro && <Alert severity="error">{erro}</Alert>}
      {mencoes.length > 0 && <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {[...new Map(mencoes.map(m => [m.usuarioId, m])).values()].map(m =>
          <Chip key={m.usuarioId} size="small" label={`@${m.nome}`} disabled={carregando}
            onDelete={() => setMencoes(atual => atual.filter(item => item.usuarioId !== m.usuarioId))} />)}
      </Stack>}
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }} spacing={2}>
        <Typography variant="caption" color="text.secondary">@ para mencionar · Ctrl+Enter para enviar</Typography>
        <Stack direction="row" spacing={1}>
          {onCancelar && <Button onClick={onCancelar} disabled={carregando}>Cancelar</Button>}
          <Button variant="contained" startIcon={carregando ? <CircularProgress size={15} color="inherit" /> : <SendOutlined />} onClick={() => void salvar()} disabled={carregando || !texto.trim()}>
            {inicial ? "Salvar edição" : "Enviar"}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default function EtapaMensagens({ etapaId, usuarioAtualId, api }: Props) {
  return <ConversaEtapa key={`${etapaId}-${usuarioAtualId}`} etapaId={etapaId} usuarioAtualId={usuarioAtualId} api={api} />;
}

function ConversaEtapa({ etapaId, usuarioAtualId, api }: Props) {
  const ativo = useRef(true);
  const operacao = useRef(false);
  const [mensagens, setMensagens] = useState<MensagemEtapa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [respostaId, setRespostaId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [conectado, setConectado] = useState(false);
  const consulta = useRef<AbortController | null>(null);
  const bloqueiaAtualizacao = useRef(false);
  const atualizacaoPendente = useRef(false);

  bloqueiaAtualizacao.current = salvando || editandoId !== null;

  const recarregar = useCallback(async () => {
    consulta.current?.abort();
    const controller = new AbortController();

    consulta.current = controller;
    try {
      const resultado = await api.listar(etapaId, controller.signal);

      if (ativo.current && !controller.signal.aborted) setMensagens(resultado);
    } catch (error) { if (!controller.signal.aborted) throw error; }
  }, [api, etapaId]);

  useEffect(() => {
    ativo.current = true;
    setCarregando(true);
    setErro("");
    void recarregar().catch(e => {
      if (ativo.current) setErro(e instanceof Error ? e.message : "Erro ao consultar mensagens.");
    }).finally(() => { if (ativo.current) setCarregando(false); });

    return () => { ativo.current = false; consulta.current?.abort(); };
  }, [recarregar]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (bloqueiaAtualizacao.current) { atualizacaoPendente.current = true;

 return; }

        void recarregar().catch(() => { if (ativo.current) setErro("Não foi possível atualizar a conversa. Use Atualizar mensagens."); });
      }, 200);
    };
    const parar = observarMensagens(etapaId, atualizar, setConectado);
    // Redis Pub/Sub não mantém eventos perdidos; reconcilia também após falhas no backplane.
    const reconcile = setInterval(atualizar, 30000);

    return () => { clearTimeout(timer); clearInterval(reconcile); parar(); };
  }, [etapaId, recarregar]);

  useEffect(() => {
    if (!salvando && editandoId === null && atualizacaoPendente.current) {
      atualizacaoPendente.current = false;
      void recarregar().catch(() => { if (ativo.current) setErro("Use Atualizar mensagens para sincronizar a conversa."); });
    }
  }, [salvando, editandoId, recarregar]);

  const porId = useMemo(() => new Map(mensagens.map(m => [m.id, m])), [mensagens]);
  const ordenadas = useMemo(() => [...mensagens].sort((a, b) => Date.parse(a.criadoEm) - Date.parse(b.criadoEm) || a.id.localeCompare(b.id, undefined, { numeric: true })), [mensagens]);

  const executar = async (acao: () => Promise<void>) => {
    if (operacao.current) throw new Error("Aguarde a operação atual.");
    operacao.current = true;
    setSalvando(true);
    setErro("");
    try {
      await acao();
      try { await recarregar(); }
      catch { if (ativo.current) setErro("Mensagem salva, mas não foi possível atualizar a conversa. Clique em Atualizar mensagens."); }
    }
    catch (e) { const msg = e instanceof Error ? e.message : "Operação não concluída.";

 setErro(msg); throw e; }
    finally { operacao.current = false; if (ativo.current) setSalvando(false); }
  };

  const excluir = async (id: string) => {
    const mensagem = porId.get(id);

    if (!mensagem || !usuarioAtualId || salvando) return;
    if (!window.confirm("Excluir esta mensagem?")) return;
    try { await executar(() => api.excluir(id, usuarioAtualId, mensagem.versao)); }
    catch { return; }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Mensagens da etapa</Typography>
          <Typography variant="body2" color="text.secondary">Converse com os envolvidos. Use @ para mencionar usuários.</Typography>
          <Typography variant="caption" color="text.secondary">{conectado ? "Conectado em tempo real" : "Reconectando · atualização periódica ativa"}</Typography>
          <Button size="small" disabled={salvando || carregando || editandoId !== null} onClick={async () => {
            setCarregando(true); setErro("");
            try { await recarregar(); }
            catch (e) { setErro(e instanceof Error ? e.message : "Erro ao atualizar mensagens."); }
            finally { if (ativo.current) setCarregando(false); }
          }}>Atualizar mensagens</Button>
        </Box>
        <Divider />
        {erro && <Alert severity="error">{erro}</Alert>}
        {carregando ? <Stack sx={{ alignItems: "center", py: 3 }}><CircularProgress /></Stack> : (
          <Stack spacing={2}>
            {ordenadas.length === 0 && <Typography color="text.secondary" variant="body2">Nenhuma mensagem publicada nesta etapa.</Typography>}
            {ordenadas.map(m => (
              <Box key={m.id} sx={{ pl: m.mensagemPaiId ? { xs: 1.5, sm: 4 } : 0, borderLeft: m.mensagemPaiId ? "2px solid" : "none", borderColor: "divider" }}>
                <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-start" }}>
                  <Avatar sx={{ width: 34, height: 34 }}>{m.usuarioNome[0]}</Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{m.usuarioNome}</Typography>
                      <Typography variant="caption" color="text.secondary">{new Date(m.criadoEm).toLocaleString("pt-BR")}</Typography>
                      {m.editadoEm && <Typography variant="caption" color="text.secondary">Editada</Typography>}
                    </Stack>
                    {m.mensagemPaiId && <Typography variant="caption" color="text.secondary">Em resposta a {porId.get(m.mensagemPaiId)?.usuarioNome ?? `#${m.mensagemPaiId}`}</Typography>}
                    {editandoId === m.id ? (
                      <Box sx={{ mt: 1 }}>
                        <EditorMensagem key={m.id + m.versao} usuariosApi={api.usuarios} inicial={m} carregando={salvando || carregando || !usuarioAtualId}
                          onCancelar={() => setEditandoId(null)}
                          onSalvar={async (conteudo, mencoes) => { await executar(() => api.editar(m.id, m.versao, { conteudo, mencoes, mensagemPaiId: m.mensagemPaiId })); setEditandoId(null); }} />
                      </Box>
                    ) : <Typography variant="body2" sx={{ mt: .7, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {m.excluidoEm ? <em>Mensagem excluída</em> : m.conteudo}
                    </Typography>}
                    {!m.excluidoEm && editandoId !== m.id && m.mencoes.length > 0 && <Stack direction="row" sx={{ flexWrap: "wrap", gap: .5, mt: 1 }}>
                      {m.mencoes.map(mencao => <Chip key={mencao.usuarioId} size="small" label={`@${mencao.nome}`} />)}
                    </Stack>}
                    {!m.excluidoEm && editandoId !== m.id && <Button size="small" startIcon={<ReplyOutlined />} disabled={salvando || !usuarioAtualId} onClick={() => setRespostaId(m.id)}>Responder</Button>}
                  </Box>
                  {m.usuarioId === usuarioAtualId && !m.excluidoEm && editandoId !== m.id && <IconButton size="small" disabled={salvando} aria-label="Ações da mensagem" onClick={e => { setMenuEl(e.currentTarget); setMenuId(m.id); }}><EditOutlined size={18} /></IconButton>}
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        <Divider />
        {!usuarioAtualId && <Alert severity="info">Selecione o operador no menu lateral para enviar mensagens.</Alert>}
        {respostaId && <Alert severity="info" action={<Button size="small" disabled={salvando} onClick={() => setRespostaId(null)}>Cancelar</Button>}>
          Respondendo a {porId.get(respostaId)?.usuarioNome ?? `#${respostaId}`}
        </Alert>}
        <EditorMensagem key={`${etapaId}-${respostaId ?? 0}`} usuariosApi={api.usuarios} carregando={salvando || carregando || !usuarioAtualId}
          onSalvar={async (conteudo, mencoes) => { await executar(() => api.criar(etapaId, usuarioAtualId, { conteudo, mencoes, mensagemPaiId: respostaId })); setRespostaId(null); }} />
      </Stack>
      <Menu anchorEl={menuEl} open={Boolean(menuEl)} onClose={() => setMenuEl(null)}>
        <MenuItem onClick={() => { setEditandoId(menuId); setMenuEl(null); }}><EditOutlined size={18} style={{ marginRight: 8 }} />Editar</MenuItem>
        <MenuItem onClick={() => { const id = menuId;

 setMenuEl(null); if (id !== null) void excluir(id); }}><DeleteOutline size={18} style={{ marginRight: 8 }} />Excluir</MenuItem>
      </Menu>
    </Paper>
  );
}
