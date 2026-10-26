export type NotificationItem = {
  id: number;
  tipo: string;
  titulo: string;
  conteudo: string;
  chamadoId: number | null;
  etapaId: number | null;
  urlDestino: string | null;
  criadoEm: string;
  lidaEm: string | null;
  visualizadaEm: string | null;
  arquivadaEm: string | null;
};

export type NotificationPage = {
  itens: NotificationItem[];
  proximoCursor: number | null;
  naoLidas: number;
};
