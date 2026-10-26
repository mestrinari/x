import type { TicketImageEvidence, TicketImageStep } from '../components/ImageEditorModal/ticketImageEvidence';
import { http } from './http';
import { apiConfig } from './config';
import type { CanvasItem } from '../components/ImageEditorModal/types';

function validarVersaoImagem(version?: string) {
  try { if (version && atob(version).length === 8) return version; } catch { /* invalid token */ }
  throw new Error('Recarregue a imagem antes de editar: versão inválida.');
}

async function arquivo(source: string) {
  const local = /^(data:|blob:)/.test(source);
  const response = await fetch(source, local ? {} : { credentials: apiConfig.credentials });
  if (!response.ok) throw new Error('Não foi possível carregar a imagem.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 20 * 1024 * 1024) throw new Error('Cada imagem deve ter entre 1 byte e 20 MiB.');
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(blob.type)) throw new Error('Formato de imagem não suportado.');
  const bytes = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1]);
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.readAsDataURL(blob);
  });
  return { bytes, type: blob.type };
}

interface ImagemDto { id: number; chamadoId: number | string; usuarioId: number; mensagemId: number | null; nomeArquivo: string; legenda: string | null; descricao: string | null; exibirInline: boolean; sensivel: boolean; ordem: number; criadoEm: string; versao: string }
interface StepDto { id: number; trackingStepId: string; codigo: string | null; nome: string | null; descricao: string | null; cor: string | null }
interface ItemDto { id: number; editorItemId: string; trackingStepId: number | null; ferramenta: string; x: number; y: number; largura: number | null; altura: number | null; corPreenchimento: string | null; corBorda: string | null; espessuraBorda: number | null; opacidadePreenchimento: number | null; rotacao: number }
interface DetailDto { imagem: ImagemDto; arquivo: { largura: number | null; altura: number | null; possuiOriginal: boolean } | null; trackingSteps: StepDto[]; editorItems: ItemDto[]; markers: { id: number; trackingStepId: number; markerId: string; xPercent: number; yPercent: number }[] }
const imagePath = (id: number) => `/api/imagens/${id}`;
export async function saveTicketImage(ticketId: string, evidence: TicketImageEvidence, actorId: string, order = 0, checkpoint: (image: TicketImageEvidence) => void = () => {}) {
  if (!/^[1-9]\d*$/.test(actorId)) throw new Error('Selecione um operador válido.');
  const body = await imagemPayload(evidence, { ordem: order });
  const existing = evidence.imagemId ? await http.get<DetailDto>(imagePath(evidence.imagemId)) : null;
  if (existing && String(existing.imagem.chamadoId) !== ticketId) throw new Error('A imagem pertence a outro chamado.');
  const metadata = { nomeArquivo: existing?.imagem.nomeArquivo ?? body.nomeArquivo, legenda: existing?.imagem.legenda ?? body.legenda,
    descricao: body.descricao, mensagemId: body.mensagemId, exibirInline: existing?.imagem.exibirInline ?? true,
    sensivel: existing?.imagem.sensivel ?? false, ordem: existing?.imagem.ordem ?? order };
  const saved = evidence.imagemId
    ? await http.put<ImagemDto>(imagePath(evidence.imagemId), { ...metadata, versao: body.versao })
    : await http.post<ImagemDto>('/api/imagens', { ...metadata, chamadoId: ticketId, usuarioId: Number(actorId) });
  let progress = { ...evidence, imagemId: saved.id, versaoImagem: saved.versao, pending: true };
  checkpoint(progress);
  const path = imagePath(saved.id);
  // Replace only the editable annotation graph. Comments and image identity remain intact.
  if (existing) {
    for (const item of existing.editorItems) await http.delete(`${path}/elementos/${item.id}`);
    for (const step of existing.trackingSteps) await http.delete(`${path}/etapas-visuais/${step.id}`);
  }
  const stepIds = new Map<string, number>();
  for (const [index, step] of body.trackingSteps.entries()) {
    const result = await http.post<StepDto>(`${path}/etapas-visuais`, { trackingStepId: step.id, codigo: step.code, nome: step.name, descricao: step.description, cor: step.color, ordem: index });
    stepIds.set(step.id, result.id);
    for (const marker of step.markers) await http.post(`${path}/etapas-visuais/${result.id}/marcadores`, { markerId: marker.id, xPercent: marker.xPercent, yPercent: marker.yPercent });
  }
  for (const [index, item] of body.editorItems.entries()) await http.post(`${path}/elementos`, {
    trackingStepId: item.trackingStepId ? stepIds.get(item.trackingStepId) ?? null : null,
    editorItemId: item.id, ferramenta: item.tool, x: item.x, y: item.y, largura: item.width, altura: item.height,
    corPreenchimento: item.fillColor, corBorda: item.strokeColor, espessuraBorda: item.strokeWidth,
    opacidadePreenchimento: item.fillOpacity, rotacao: item.rotation, ordem: index,
  });
  const file = body.arquivo!;
  await http.put(`${path}/arquivo`, { contentType: file.contentType, imagemBase64: file.imagemBytes,
    imagemOriginalBase64: file.imagemOriginalBytes, contentTypeOriginal: file.contentTypeOriginal, largura: file.largura, altura: file.altura });
  // Upload changes the image rowversion, not the ticket version.
  const detail = await http.get<DetailDto>(path);
  progress = { ...progress, versaoImagem: detail.imagem.versao, pending: false };
  checkpoint(progress);
  return detail.imagem;
}

export async function deleteTicketImage(evidence: TicketImageEvidence) {
  if (!evidence.imagemId) return;
  await http.delete(imagePath(evidence.imagemId), undefined, { query: { versao: validarVersaoImagem(evidence.versaoImagem) } });
}

export async function loadTicketImages(ticketId: string): Promise<TicketImageEvidence[]> {
  const records: ImagemDto[] = [];
  for (let pagina = 1; ; pagina++) {
    const page = await http.get<{ itens: ImagemDto[]; total: number }>(`/api/imagens/chamado/${encodeURIComponent(ticketId)}`, { query: { pagina, tamanho: 100 } });
    records.push(...page.itens);
    if (!page.itens.length || records.length >= page.total) break;
  }
  const images: TicketImageEvidence[] = [];
  for (const record of records.filter(image => image.mensagemId == null)) {
    const detail = await http.get<DetailDto>(imagePath(record.id));
    const { imagem: image, arquivo: file } = detail;
    let extra: Partial<TicketImageEvidence> = {};
    try { const parsed = JSON.parse(image.descricao || '{}'); if (parsed.schema === 'qa-ticket-image-evidence/v2') extra = parsed; } catch { /* textual description */ }
    const steps = detail.trackingSteps.map(step => ({ id: step.trackingStepId, code: step.codigo ?? '', name: step.nome ?? '', description: step.descricao ?? '', color: step.cor ?? '#ef4444',
      markers: detail.markers.filter(marker => marker.trackingStepId === step.id).map(marker => ({ id: marker.markerId, xPercent: marker.xPercent, yPercent: marker.yPercent })) }));
    const url = `${apiConfig.baseUrl}${imagePath(image.id)}/arquivo/download`;
    const restoredItems: CanvasItem[] = detail.editorItems.flatMap(item => item.ferramenta === 'rectangle' ? [{
      id: item.editorItemId, tool: 'rectangle' as const,
      trackingStepId: detail.trackingSteps.find(step => step.id === item.trackingStepId)?.trackingStepId,
      x: item.x, y: item.y, width: item.largura ?? 0, height: item.altura ?? 0,
      fillColor: item.corPreenchimento ?? 'transparent', strokeColor: item.corBorda ?? '#ef4444',
      strokeWidth: item.espessuraBorda ?? 1, fillOpacity: item.opacidadePreenchimento ?? 0, rotation: item.rotacao,
    }] : []);
    images.push({ id: `saved-${image.id}`, imagemId: image.id, versaoImagem: image.versao, mensagemId: image.mensagemId,
      imageDataUrl: file ? `${url}?original=${file.possuiOriginal}&v=${encodeURIComponent(image.versao)}` : '',
      attachmentDataUrl: file ? `${url}?original=false&v=${encodeURIComponent(image.versao)}` : '',
      width: file?.largura ?? extra.width ?? 0, height: file?.altura ?? extra.height ?? 0, createdAt: image.criadoEm,
      editorItems: Array.isArray(extra.editorItems) ? extra.editorItems : restoredItems, trackingSteps: steps.map(({ markers, ...step }) => step), steps,
    });
  }
  return images;
}
export interface TrackingImagemResponse {
  id: string; code: string | null; name: string | null; description: string | null; color: string | null;
}
export interface EditorImagemResponse {
  id: string; trackingStepId: string | null; tool: string; x: number; y: number;
  width: number | null; height: number | null; fillColor: string | null; strokeColor: string | null;
  strokeWidth: number | null; fillOpacity: number | null; rotation: number;
}
export interface ImagemNormalizada {
  id: number; chamadoId: number; mensagemId: number | null; usuarioId: number;
  versao: string; sha256: string | null; url: string | null;
  nomeArquivo: string; contentType: string | null; contentTypeOriginal: string | null; mimeType: string | null;
  legenda: string | null; descricao: string | null; exibirInline: boolean; ordem: number;
  larguraImagem: number | null; alturaImagem: number | null; tamanhoBytes: string; criadoEm: string; modificadoEm: string | null;
  steps: Array<TrackingImagemResponse & { markers: TicketImageStep["markers"] }>;
  editorItems: EditorImagemResponse[]; trackingSteps: TrackingImagemResponse[];
  comentarios: unknown[];
}
export interface ImagemWriteRequest {
  id?: number; versao?: string; mensagemId: number | null; nomeArquivo: string;
  legenda: string | null; descricao: string | null; exibirInline: boolean; ordem: number;
  arquivo?: { contentType: string; imagemBytes: string; imagemOriginalBytes: string | null;
    contentTypeOriginal: string | null; largura: number | null; altura: number | null };
  trackingSteps: Array<TrackingImagemResponse & { markers: TicketImageStep["markers"] }>;
  editorItems: EditorImagemResponse[];
}

export async function imagemPayload(evidence: TicketImageEvidence, options: { nomeArquivo?: string; legenda?: string | null; exibirInline?: boolean; sensivel?: boolean; ordem?: number; imagemId?: number; versao?: string; mensagemId?: number | null } = {}): Promise<ImagemWriteRequest> {
  const original = await arquivo(evidence.imageDataUrl);
  const rendered = evidence.attachmentDataUrl && evidence.attachmentDataUrl !== evidence.imageDataUrl
    ? await arquivo(evidence.attachmentDataUrl) : original;
  const trackingSteps = evidence.trackingSteps.map(step => ({ ...step, markers: evidence.steps.find(x => x.id === step.id)?.markers || [] }));
  for (const step of evidence.steps) if (!trackingSteps.some(x => x.id === step.id)) trackingSteps.push(step);
  const imagemId = options.imagemId ?? evidence.imagemId;
  const versao = imagemId ? validarVersaoImagem(options.versao ?? evidence.versaoImagem) : undefined;
  return {
    ...(imagemId ? { id: imagemId, versao: versao! } : {}),
    mensagemId: options.mensagemId !== undefined ? options.mensagemId : evidence.mensagemId ?? null,
    nomeArquivo: options.nomeArquivo || `evidencia.${original.type.split("/")[1]}`,
    legenda: options.legenda ?? null, exibirInline: options.exibirInline ?? true, ordem: options.ordem ?? 0,
    descricao: JSON.stringify({ schema: "qa-ticket-image-evidence/v2", width: evidence.width, height: evidence.height,
      steps: evidence.steps, editorItems: evidence.editorItems, trackingSteps: evidence.trackingSteps, sensivel: options.sensivel ?? false }),
    arquivo: { contentType: rendered.type, imagemBytes: rendered.bytes, imagemOriginalBytes: original.bytes,
      contentTypeOriginal: original.type, largura: evidence.width, altura: evidence.height },
    trackingSteps,
    editorItems: evidence.editorItems.map(item => ({
      id: item.id, trackingStepId: item.trackingStepId ?? null, tool: item.tool,
      x: "x" in item ? item.x : item.points[0]?.x ?? 0,
      y: "y" in item ? item.y : item.points[0]?.y ?? 0,
      width: item.tool === "rectangle" ? item.width : null, height: item.tool === "rectangle" ? item.height : null,
      fillColor: item.tool === "rectangle" ? item.fillColor : null,
      strokeColor: item.tool === "rectangle" ? item.strokeColor : null,
      strokeWidth: item.tool === "rectangle" ? item.strokeWidth : null,
      fillOpacity: item.tool === "rectangle" ? item.fillOpacity : null,
      rotation: "rotation" in item ? item.rotation : 0,
    })),
  };
}



