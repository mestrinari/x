export type ApiId = number | string;

export type Nullable<T> = T | null;

export interface PageResponse<T> {
  itens: T[];
  pagina: number;
  tamanho: number;
  total: number;
}

export interface Chamado {
  id: ApiId;
  titulo: string;
  descricao?: Nullable<string>;
  status: number;
  criadoPor: number;
  atribuidoPara?: Nullable<number>;
  criadoEm: string;
  concluidoEm?: Nullable<string>;
  excluidoEm?: Nullable<string>;
  versao: string;
}

export interface ChamadoFluxo {
  id: ApiId;
  chamadoId: ApiId;
  nome: string;
  descricao?: Nullable<string>;
  status: number;
  permitirExecucoesSimultaneasEtapa: boolean;
  criadoEm: string;
  criadoPor: number;
  concluidoEm?: Nullable<string>;
  excluidoEm?: Nullable<string>;
  excluidoPor?: Nullable<number>;
  revisaoEstrutural: ApiId;
  versao: string;
}

export interface ChamadoFluxoEtapa {
  id: ApiId;
  fluxoId: ApiId;
  nome: string;
  descricao?: Nullable<string>;
  ordemVisual?: Nullable<number>;
  modoConvergencia: number;
  statusAdministrativo: number;
  permitirExecucoesSimultaneas: boolean;
  exigirConclusaoManual: boolean;
  criadoEm: string;
  criadoPor: number;
  excluidoEm?: Nullable<string>;
  excluidoPor?: Nullable<number>;
  versao: string;
}

export interface ChamadoFluxoEtapaDependencia {
  id: ApiId;
  etapaOrigemId: ApiId;
  etapaDestinoId: ApiId;
  tipoCondicao: number;
  configuracaoCondicao?: Nullable<string>;
  ordemAvaliacao?: Nullable<number>;
  criadoEm: string;
  criadoPor: number;
  excluidoEm?: Nullable<string>;
  excluidoPor?: Nullable<number>;
  versao: string;
}

export interface ChamadoFluxoEtapaExecucao {
  id: ApiId;
  etapaId: ApiId;
  numeroExecucao: number;
  status: number;
  validadeResultado: number;
  execucaoAnteriorId?: Nullable<ApiId>;
  iniciadoEm?: Nullable<string>;
  iniciadoPor?: Nullable<number>;
  concluidoEm?: Nullable<string>;
  concluidoPor?: Nullable<number>;
  resultado?: Nullable<string>;
  motivoReprocessamento?: Nullable<string>;
  versao: string;
}

export interface ChamadoFluxoEtapaExecucaoDependencia {
  id: ApiId;
  execucaoId: ApiId;
  dependenciaId: ApiId;
  execucaoOrigemUtilizadaId?: Nullable<ApiId>;
  statusAvaliacao: number;
  revisaoEstruturalAvaliada?: Nullable<ApiId>;
  validadoManualmente: boolean;
  validadoPor?: Nullable<number>;
  validadoEm?: Nullable<string>;
  avaliadoEm: string;
  versao: string;
}

export interface ChamadoFluxoEtapaExecucaoTransicao {
  id: ApiId;
  dependenciaId: ApiId;
  execucaoOrigemId: ApiId;
  execucaoDestinoId?: Nullable<ApiId>;
  resultadoAvaliacao: number;
  revisaoEstruturalAvaliada?: Nullable<ApiId>;
  tipoAcionamento: number;
  motivoDecisao?: Nullable<string>;
  executadoEm: string;
  executadoPor?: Nullable<number>;
}

export interface ChamadoFluxoEtapaResponsavel {
  id: ApiId;
  etapaId: ApiId;
  usuarioId: number;
  atribuidoEm?: Nullable<string>;
  atribuidoPor?: Nullable<number>;
  removidoEm?: Nullable<string>;
  removidoPor?: Nullable<number>;
}

export interface ChamadoFluxoHistorico {
  id: ApiId;
  fluxoId: ApiId;
  tipoEvento: string;
  entidadeRelacionadaId?: Nullable<ApiId>;
  dadosAnteriores?: Nullable<string>;
  dadosNovos?: Nullable<string>;
  motivo?: Nullable<string>;
  criadoEm: string;
  criadoPor?: Nullable<number>;
}

export interface ChamadoFluxoEtapaHistorico extends ChamadoFluxoHistorico {
  etapaId: ApiId;
}

export interface Usuario {
  id: number;
  usuarioTipoId: number;
  nome: string;
  email: string;
  ativo: boolean;
  criadoEm: string;
}

export interface UsuarioTipo {
  id: number;
  nome: string;
  descricao?: Nullable<string>;
  ativo: boolean;
}

export interface ListParams {
  [key: string]: string | number | boolean | null | undefined;
  Pagina?: number;
  Tamanho?: number;
}

export interface ChamadosListParams extends ListParams {
  status?: number;
}

export interface FluxosListParams extends ListParams {
  chamadoId?: ApiId;
  status?: number;
}

export interface EtapasListParams extends ListParams {
  fluxoId?: ApiId;
}

export interface DependenciasListParams extends ListParams {
  etapaOrigemId?: ApiId;
  etapaDestinoId?: ApiId;
}

export interface ExecucoesListParams extends ListParams {
  etapaId?: ApiId;
  status?: number;
}

export interface AvaliacoesDependenciasListParams extends ListParams {
  execucaoId?: ApiId;
  dependenciaId?: ApiId;
}

export interface TransicoesListParams extends ListParams {
  dependenciaId?: ApiId;
  execucaoOrigemId?: ApiId;
}

export interface ResponsaveisListParams extends ListParams {
  etapaId?: ApiId;
  usuarioId?: number;
}

export interface HistoricosFluxosListParams extends ListParams {
  fluxoId?: ApiId;
}

export interface HistoricosEtapasListParams extends ListParams {
  etapaId?: ApiId;
}

export interface UsuariosListParams extends ListParams {
  usuarioTipoId?: number;
  ativo?: boolean;
}

export interface TiposUsuarioListParams extends ListParams {
  ativo?: boolean;
}

export interface CriarChamadoRequest {
  titulo: string;
  descricao?: Nullable<string>;
  status?: number;
  criadoPor?: number;
  atribuidoPara?: Nullable<number>;
  concluidoEm?: Nullable<string>;
}

export interface AtualizarChamadoRequest extends Omit<CriarChamadoRequest, 'titulo'> {
  titulo: string;
  versao: string;
}

export interface CriarChamadoFluxoRequest {
  revisaoEstrutural?: ApiId;
  chamadoId?: ApiId;
  nome: string;
  descricao?: Nullable<string>;
  status?: number;
  permitirExecucoesSimultaneasEtapa?: boolean;
  criadoPor?: number;
  concluidoEm?: Nullable<string>;
}

export interface AtualizarChamadoFluxoRequest extends Omit<CriarChamadoFluxoRequest, 'nome'> {
  nome: string;
  versao: string;
}

export interface CriarChamadoFluxoEtapaRequest {
  fluxoId?: ApiId;
  nome: string;
  descricao?: Nullable<string>;
  ordemVisual?: Nullable<number>;
  modoConvergencia?: number;
  statusAdministrativo?: number;
  permitirExecucoesSimultaneas?: boolean;
  exigirConclusaoManual?: boolean;
  criadoPor?: number;
}

export interface AtualizarChamadoFluxoEtapaRequest extends CriarChamadoFluxoEtapaRequest {
  nome: string;
  versao: string;
}

export interface CriarChamadoFluxoEtapaDependenciaRequest {
  etapaOrigemId?: ApiId;
  etapaDestinoId?: ApiId;
  tipoCondicao?: number;
  configuracaoCondicao?: Nullable<string>;
  ordemAvaliacao?: Nullable<number>;
  criadoPor?: number;
}

export interface AtualizarChamadoFluxoEtapaDependenciaRequest extends CriarChamadoFluxoEtapaDependenciaRequest {
  versao: string;
}

export interface CriarChamadoFluxoEtapaExecucaoRequest {
  etapaId?: ApiId;
  numeroExecucao?: number;
  status?: number;
  validadeResultado?: number;
  execucaoAnteriorId?: Nullable<ApiId>;
  iniciadoEm?: Nullable<string>;
  iniciadoPor?: Nullable<number>;
  concluidoEm?: Nullable<string>;
  concluidoPor?: Nullable<number>;
  resultado?: Nullable<string>;
  motivoReprocessamento?: Nullable<string>;
}

export interface AtualizarChamadoFluxoEtapaExecucaoRequest extends CriarChamadoFluxoEtapaExecucaoRequest {
  versao: string;
}

export interface CriarChamadoFluxoEtapaExecucaoDependenciaRequest {
  execucaoId?: ApiId;
  dependenciaId?: ApiId;
  execucaoOrigemUtilizadaId?: Nullable<ApiId>;
  statusAvaliacao?: number;
  revisaoEstruturalAvaliada?: Nullable<ApiId>;
  validadoManualmente?: boolean;
  validadoPor?: Nullable<number>;
  validadoEm?: Nullable<string>;
}

export interface AtualizarChamadoFluxoEtapaExecucaoDependenciaRequest extends CriarChamadoFluxoEtapaExecucaoDependenciaRequest {
  versao: string;
}

export interface CriarChamadoFluxoEtapaExecucaoTransicaoRequest {
  dependenciaId?: ApiId;
  execucaoOrigemId?: ApiId;
  execucaoDestinoId?: Nullable<ApiId>;
  resultadoAvaliacao?: number;
  revisaoEstruturalAvaliada?: Nullable<ApiId>;
  tipoAcionamento?: number;
  motivoDecisao?: Nullable<string>;
  executadoPor?: Nullable<number>;
}

export interface CriarChamadoFluxoEtapaHistoricoRequest {
  etapaId?: ApiId;
  tipoEvento: string;
  entidadeRelacionadaId?: Nullable<ApiId>;
  dadosAnteriores?: Nullable<string>;
  dadosNovos?: Nullable<string>;
  motivo?: Nullable<string>;
  criadoPor?: Nullable<number>;
}

export interface CriarChamadoFluxoHistoricoRequest {
  fluxoId?: ApiId;
  tipoEvento: string;
  entidadeRelacionadaId?: Nullable<ApiId>;
  dadosAnteriores?: Nullable<string>;
  dadosNovos?: Nullable<string>;
  motivo?: Nullable<string>;
  criadoPor?: Nullable<number>;
}

export interface CriarChamadoFluxoEtapaResponsavelRequest {
  etapaId?: ApiId;
  usuarioId?: number;
  atribuidoPor?: number;
}

export interface CriarUsuarioRequest {
  usuarioTipoId?: number;
  nome: string;
  email: string;
  ativo?: boolean;
}

export type AtualizarUsuarioRequest = CriarUsuarioRequest;

export interface CriarUsuarioTipoRequest {
  nome: string;
  descricao?: Nullable<string>;
  ativo?: boolean;
}

export type AtualizarUsuarioTipoRequest = CriarUsuarioTipoRequest;

export interface ExcluirRequest {
  usuarioId?: number;
  versao: string;
}

export interface RemoverResponsavelRequest {
  usuarioId?: number;
}
