import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
  type RefObject,
} from "react";
import type { CanvasItem, Tool } from "./types";
type Dimensions = { w: number; h: number };
type CropArea = { x: number; y: number; w: number; h: number } | null;
type Snapshot = {
  items: CanvasItem[];
  src: string | null;
  image: HTMLImageElement | null;
  dimensions: Dimensions;
};
type Props = {
  sourceImageRef: RefObject<HTMLImageElement | null>;
  imageSrc: string | null;
  setItems: Dispatch<SetStateAction<CanvasItem[]>>;
  setImageSrc: Dispatch<SetStateAction<string | null>>;
  setImageDimensions: Dispatch<SetStateAction<Dimensions>>;
  setCropArea: Dispatch<SetStateAction<CropArea>>;
  setTool: Dispatch<SetStateAction<Tool>>;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
};
export function useEditorHistory({
  sourceImageRef,
  imageSrc,
  setItems,
  setImageSrc,
  setImageDimensions,
  setCropArea,
  setTool,
  setSelectedId,
}: Props) {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const pushHistory = useCallback(
    (
      newItems: CanvasItem[],
      image = sourceImageRef.current,
      src = imageSrc,
    ) => {
      const dimensions = image
        ? { w: image.naturalWidth, h: image.naturalHeight }
        : { w: 0, h: 0 };
      setHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        sliced.push({ items: newItems, image, src, dimensions });
        return sliced.slice(-50);
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
      setItems(newItems);
      sourceImageRef.current = image;
      setImageSrc(src);
      setImageDimensions(dimensions);
    },
    [historyIndex, imageSrc],
  );

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    setHistoryIndex(prevIndex);
    const snapshot = history[prevIndex];
    setItems(snapshot!.items);
    setImageSrc(snapshot!.src);
    sourceImageRef.current = snapshot!.image;
    setImageDimensions(snapshot!.dimensions);
    setCropArea(null);
    setTool("select");
    setSelectedId(null);
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const snapshot = history[nextIndex];
    setItems(snapshot!.items);
    setImageSrc(snapshot!.src);
    sourceImageRef!.current = snapshot!.image;
    setImageDimensions(snapshot!.dimensions);
    setCropArea(null);
    setTool("select");
    setSelectedId(null);
  }, [historyIndex, history]);

  return {
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    pushHistory,
    undo,
    redo,
  };
}
