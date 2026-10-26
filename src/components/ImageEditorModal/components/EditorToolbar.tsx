import {
  Pencil,
  Square,
  Type,
  Scissors,
  Undo2,
  Redo2,
  Upload,
  Trash2,
  X,
  MousePointer2,
  Eraser,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { MAX_ZOOM, MIN_ZOOM } from "../constants";

import { Divider, ToolBtn, Toolbar } from "../styles";

import type { ImageEditorController } from "../useImageEditor";

type Props = Pick<
  ImageEditorController,
  | "imageSrc"
  | "tool"
  | "setTool"
  | "items"
  | "history"
  | "historyIndex"
  | "zoom"
  | "setZoom"
  | "isLoadingImage"
  | "undo"
  | "redo"
  | "fitImageToArea"
  | "clearAll"
  | "handleUploadClick"
>;

export function EditorToolbar({
  imageSrc,
  tool,
  setTool,
  items,
  history,
  historyIndex,
  zoom,
  setZoom,
  isLoadingImage,
  undo,
  redo,
  fitImageToArea,
  clearAll,
  handleUploadClick,
}: Props) {
  return (
    <Toolbar aria-label="Ferramentas do editor">
      <ToolBtn
        type="button"
        $active={tool === "select"}
        onClick={() => setTool("select")}
        title="Selecionar"
        aria-label="Selecionar"
        disabled={!imageSrc || isLoadingImage}
      >
        <MousePointer2 size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        $active={tool === "pen"}
        onClick={() => setTool("pen")}
        title="Lápis"
        aria-label="Lápis"
        disabled={!imageSrc || isLoadingImage}
      >
        <Pencil size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        $active={tool === "eraser"}
        onClick={() => setTool("eraser")}
        title="Borracha"
        aria-label="Borracha"
        disabled={!imageSrc || isLoadingImage}
      >
        <Eraser size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        $active={tool === "rectangle"}
        onClick={() => setTool("rectangle")}
        title="Retângulo"
        aria-label="Retângulo"
        disabled={!imageSrc || isLoadingImage}
      >
        <Square size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        $active={tool === "text"}
        onClick={() => setTool("text")}
        title="Texto"
        aria-label="Texto"
        disabled={!imageSrc || isLoadingImage}
      >
        <Type size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        $active={tool === "crop"}
        onClick={() => setTool("crop")}
        title="Recortar"
        aria-label="Recortar"
        disabled={!imageSrc || isLoadingImage}
      >
        <Scissors size={18} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        type="button"
        onClick={undo}
        title="Desfazer (Ctrl+Z)"
        aria-label="Desfazer"
        disabled={historyIndex <= 0}
      >
        <Undo2 size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        onClick={redo}
        title="Refazer (Ctrl+Shift+Z)"
        aria-label="Refazer"
        disabled={historyIndex >= history.length - 1}
      >
        <Redo2 size={18} />
      </ToolBtn>
      <Divider />
      <ToolBtn onClick={handleUploadClick} title="Upload imagem">
        <Upload size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        onClick={clearAll}
        title="Limpar tudo"
        aria-label="Limpar tudo"
        disabled={!items.length}
      >
        <Trash2 size={18} />
      </ToolBtn>
      <Divider />
      <ToolBtn
        type="button"
        onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.1))}
        title="Diminuir zoom"
        aria-label="Diminuir zoom"
        disabled={!imageSrc || zoom <= MIN_ZOOM}
      >
        <ZoomOut size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.1))}
        title="Aumentar zoom"
        aria-label="Aumentar zoom"
        disabled={!imageSrc || zoom >= MAX_ZOOM}
      >
        <ZoomIn size={18} />
      </ToolBtn>
      <ToolBtn
        type="button"
        onClick={fitImageToArea}
        title="Ajustar imagem à tela"
        aria-label="Ajustar imagem à tela"
        disabled={!imageSrc || isLoadingImage}
      >
        <X size={18} />
      </ToolBtn>
    </Toolbar>
  );
}
