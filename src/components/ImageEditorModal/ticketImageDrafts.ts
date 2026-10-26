import { useSyncExternalStore } from 'react';
import type { TicketImageEvidence } from './ticketImageEvidence';

// Keep pending and persisted documents separate by operator and ticket.
let documents: Record<string, TicketImageEvidence[]> = {};
const listeners = new Set<() => void>();
const empty: TicketImageEvidence[] = [];
const key = (actorId: string, ticketId: string) => JSON.stringify([actorId, ticketId]);
const emit = () => listeners.forEach(listener => listener());

export const getTicketImageDrafts = (actorId: string, ticketId: string) => documents[key(actorId, ticketId)] ?? empty;

export function mergeTicketImages(actorId: string, ticketId: string, images: TicketImageEvidence[]) {
  const existing = getTicketImageDrafts(actorId, ticketId);
  const merged = images.map(image => {
    const previous = existing.find(item => item.imagemId === image.imagemId);

    return previous?.pending ? previous : { ...image, id: previous?.id ?? image.id, pending: false };
  });

  documents = { ...documents, [key(actorId, ticketId)]: [...merged, ...existing.filter(item => item.pending && !images.some(image => image.imagemId === item.imagemId && item.imagemId != null))] };
  emit();
}

export function useTicketImageDrafts(actorId: string, ticketId: string) {
  return useSyncExternalStore(listener => { listeners.add(listener);

 return () => { listeners.delete(listener); }; },
    () => documents[key(actorId, ticketId)] ?? empty);
}

export function includeTicketImage(actorId: string, ticketId: string, evidence: TicketImageEvidence) {
  const target = key(actorId, ticketId);

  documents = { ...documents, [target]: [...(documents[target] ?? []).filter(item => item.id !== evidence.id), structuredClone(evidence)] };
  emit();
}

export function removeTicketImage(actorId: string, ticketId: string, imageId: string) {
  const target = key(actorId, ticketId);

  documents = { ...documents, [target]: (documents[target] ?? []).filter(item => item.id !== imageId) };
  emit();
}

export function moveTicketImageDrafts(actorId: string, from: string, to: string) {
  if (from === to) return;
  const source = key(actorId, from), target = key(actorId, to);

  if (!documents[source]?.length) return;
  documents = { ...documents, [target]: [...(documents[target] ?? []), ...documents[source]] };
  delete documents[source];
  emit();
}
