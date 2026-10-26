import { Button } from "../ui/Button";
import { Undo2, Redo2, ZoomIn, ZoomOut } from "lucide-react";

import { MAX_ZOOM, MIN_ZOOM } from "../constants";

import {
  BottomActions,
  BottomBar,
  FooterHint,
  FooterStatus,
  ZoomBadge,
} from "../styles";

import type { ImageEditorController } from "../useImageEditor";

type Props = Pick<
  ImageEditorController,
  | "imageSrc"
  | "imageDimensions"
  | "items"
  | "history"
  | "historyIndex"
  | "includeTrackingOverlay"
  | "zoom"
  | "setZoom"
  | "isLoadingImage"
  | "undo"
  | "redo"
  | "fitImageToArea"
  | "activeTrackingStep"
>;
export function EditorFooter({
  imageSrc,
  imageDimensions,
  items,
  history,
  historyIndex,
  includeTrackingOverlay,
  zoom,
  setZoom,
  isLoadingImage,
  undo,
  redo,
  fitImageToArea,
  activeTrackingStep,
}: Props) {
  return (
    <BottomBar>
      <FooterStatus aria-live="polite">
        <span
          style={{
            width: 10,
            height: 10,
            flex: "none",
            borderRadius: "50%",
            background: activeTrackingStep?.color ?? "#64748b",
            boxShadow: activeTrackingStep
              ? `0 0 0 3px ${activeTrackingStep.color}25`
              : "none",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {activeTrackingStep
              ? `${activeTrackingStep.code} · ${activeTrackingStep.name}`
              : "Edição livre, sem passo ativo"}
          </strong>
          <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>
            {items.length} item(ns) · {imageDimensions.w} × {imageDimensions.h}
            px · overlay {includeTrackingOverlay ? "ativo" : "inativo"}
          </span>
        </div>
      </FooterStatus>

      <FooterHint data-role="footer-hint">
        Ctrl+Z desfaz · Delete remove · R gira · Ctrl+V cola imagem
      </FooterHint>

      <BottomActions data-role="bottom-actions" style={{ justifySelf: "end" }}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Undo2 size={13} />}
          onClick={undo}
          disabled={historyIndex <= 0}
        >
          Desfazer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Redo2 size={13} />}
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
        >
          Refazer
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((value) => Math.max(MIN_ZOOM, value - 0.1))}
          aria-label="Diminuir zoom"
          disabled={!imageSrc || zoom <= MIN_ZOOM}
        >
          <ZoomOut size={13} />
        </Button>
        <ZoomBadge>{Math.round(zoom * 100)}%</ZoomBadge>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((value) => Math.min(MAX_ZOOM, value + 0.1))}
          aria-label="Aumentar zoom"
          disabled={!imageSrc || zoom >= MAX_ZOOM}
        >
          <ZoomIn size={13} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={fitImageToArea}
          disabled={!imageSrc || isLoadingImage}
        >
          Ajustar
        </Button>
      </BottomActions>
    </BottomBar>
  );
}
