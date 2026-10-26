import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ImageComment, ImageCommentStep } from '../api/imageComments';

export function commentStepIds(comment: ImageComment) {
  return new Set([
    ...comment.mencoes.map(mention => mention.trackingStepId).filter((id): id is number => id != null),
    ...Array.from(comment.comentario.matchAll(/\(etapa #(\d+)\)/g), match => Number(match[1])),
  ]);
}
function useReferences() {
  const [data, setData] = useState<{ comments: ImageComment[]; steps: ImageCommentStep[] }>({ comments: [], steps: [] });
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  return useMemo(() => ({ ...data, setData, hovered, setHovered, selected, setSelected, imageRef }), [data, hovered, selected]);
}
const Context = createContext<ReturnType<typeof useReferences> | null>(null);
export function ImageReferenceProvider({ children }: { children: ReactNode }) {
  const value = useReferences();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useImageReferences = () => useContext(Context);
