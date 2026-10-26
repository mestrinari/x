import { http } from './http';

export interface ImageMention {
  id: number; comentarioId: number; usuarioId: number; criadoEm: string;
}
export interface ImageMentionInput {
  usuarioId: number;
}
export interface ImageComment {
  id: number; imagemId: number; usuarioId: number; autorNome: string;
  comentario: string; criadoEm: string; modificadoEm: string | null; mencoes: ImageMention[];
}
const path = (imageId: number) => `/api/imagens/${imageId}/comentarios`;
export async function loadImageComments(imageId: number) {
  const detail = await http.get<{ comentarios: ImageComment[] }>(`/api/imagens/${imageId}`);
  return detail.comentarios;
}
export function createImageComment(imageId: number, usuarioId: number, autorNome: string, comentario: string, mencoes: ImageMentionInput[]) {
  return http.post<ImageComment>(path(imageId), { usuarioId, autorNome, comentario, mencoes });
}
export function editImageComment(imageId: number, id: number, comentario: string, mencoes: ImageMentionInput[]) {
  return http.put<ImageComment>(`${path(imageId)}/${id}`, { comentario, mencoes });
}
export function deleteImageComment(imageId: number, id: number) {
  return http.delete<void>(`${path(imageId)}/${id}`);
}
