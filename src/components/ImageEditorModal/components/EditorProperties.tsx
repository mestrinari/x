import { Button } from "../ui/Button";
import { Trash2, RotateCcw, BringToFront, SendToBack } from "lucide-react";

import type { RectShape, TextShape } from "../types";
import { MAX_ZOOM, MIN_ZOOM, PALETTE_COLORS } from "../constants";
import { getCanvasItemColor, getCanvasItemLabel } from "../geometry";

import {
  CanvasItemCard,
  ColorRow,
  ColorSwatch,
  PanelLabel,
  RightPanel,
  SelectInput,
  SliderInput,
  TextInput,
  TextareaInput,
} from "../styles";
import { ConfigPanel } from "./ConfigPanel";

import type { ImageEditorController } from "../useImageEditor";

type Props = Pick<
  ImageEditorController,
  | "tool"
  | "setTool"
  | "currentColor"
  | "strokeWidth"
  | "setStrokeWidth"
  | "fontSize"
  | "setFontSize"
  | "fontWeight"
  | "setFontWeight"
  | "rectFillColor"
  | "setRectFillColor"
  | "rectStrokeColor"
  | "setRectStrokeColor"
  | "rectFillOpacity"
  | "setRectFillOpacity"
  | "items"
  | "selectedId"
  | "setSelectedId"
  | "trackingSteps"
  | "cropArea"
  | "textInput"
  | "setTextInput"
  | "zoom"
  | "setZoom"
  | "isLoadingImage"
  | "panelProps"
  | "applyTrackingColor"
  | "pushHistory"
  | "canvasWidth"
  | "setCanvasWidth"
  | "canvasHeight"
  | "setCanvasHeight"
  | "resizeCanvas"
  | "resetRotation"
  | "selectedItem"
  | "activeTrackingStep"
  | "assignSelectedItemToTrackingStep"
  | "handleRotationChange"
  | "commitRotationChange"
>;
export function EditorProperties({
  tool,
  setTool,
  currentColor,
  strokeWidth,
  setStrokeWidth,
  fontSize,
  setFontSize,
  fontWeight,
  setFontWeight,
  rectFillColor,
  setRectFillColor,
  rectStrokeColor,
  setRectStrokeColor,
  rectFillOpacity,
  setRectFillOpacity,
  items,
  selectedId,
  setSelectedId,
  trackingSteps,
  cropArea,
  textInput,
  setTextInput,
  zoom,
  setZoom,
  isLoadingImage,
  panelProps,
  applyTrackingColor,
  pushHistory,
  canvasWidth,
  setCanvasWidth,
  canvasHeight,
  setCanvasHeight,
  resizeCanvas,
  resetRotation,
  selectedItem,
  activeTrackingStep,
  assignSelectedItemToTrackingStep,
  handleRotationChange,
  commitRotationChange,
}: Props) {
  return (
    <RightPanel>
      <span
        style={{
          color: "var(--muted-foreground)",
          fontSize: 10,
          lineHeight: 1.4,
        }}
      >
        Clique no título para recolher · arraste para reorganizar · use o canto
        do card para redimensionar
      </span>
      <ConfigPanel id="canvas" panelProps={panelProps} title="Área editável">
        <label style={{ display: "grid", gap: 4, marginBottom: 8 }}>
          Largura (px)
          <TextInput
            aria-label="Largura da área editável"
            type="number"
            min={1}
            max={8192}
            step={1}
            value={canvasWidth}
            disabled={isLoadingImage}
            onChange={(event) => setCanvasWidth(event.target.value)}
          />
        </label>
        <label style={{ display: "grid", gap: 4, marginBottom: 8 }}>
          Altura (px)
          <TextInput
            aria-label="Altura da área editável"
            type="number"
            min={1}
            max={8192}
            step={1}
            value={canvasHeight}
            disabled={isLoadingImage}
            onChange={(event) => setCanvasHeight(event.target.value)}
          />
        </label>
        <Button
          variant="ghost"
          size="sm"
          disabled={isLoadingImage}
          onClick={() => void resizeCanvas()}
        >
          Aplicar tamanho
        </Button>
      </ConfigPanel>
      <ConfigPanel
        id="items"
        panelProps={panelProps}
        title="Itens da edição"
        count={items.length}
      >
        {selectedId && (
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Button
              variant="ghost"
              size="sm"
              title="Trazer camada para frente"
              leftIcon={<BringToFront size={14} />}
              onClick={() => {
                const selected = items.find((item) => item.id === selectedId);
                if (selected)
                  pushHistory([
                    ...items.filter((item) => item.id !== selectedId),
                    selected,
                  ]);
              }}
            >
              Frente
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Enviar camada para trás"
              leftIcon={<SendToBack size={14} />}
              onClick={() => {
                const selected = items.find((item) => item.id === selectedId);
                if (selected)
                  pushHistory([
                    selected,
                    ...items.filter((item) => item.id !== selectedId),
                  ]);
              }}
            >
              Trás
            </Button>
          </div>
        )}
        {items.length ? (
          items.map((item, index) => {
            const trackingStep = trackingSteps.find(
              (step) => step.id === item.trackingStepId,
            );
            return (
              <CanvasItemCard
                type="button"
                key={item.id}
                $active={selectedId === item.id}
                $color={trackingStep?.color ?? getCanvasItemColor(item)}
                onClick={() => {
                  setSelectedId(item.id);
                  setTool("select");
                }}
                title={`Selecionar ${getCanvasItemLabel(item, index)}`}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 11,
                  }}
                >
                  {getCanvasItemLabel(item, index)}
                </span>
                <span
                  style={{
                    color: trackingStep?.color ?? "#64748b",
                    fontSize: 9,
                  }}
                >
                  {trackingStep?.code ?? "livre"}
                </span>
              </CanvasItemCard>
            );
          })
        ) : (
          <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
            Os elementos desenhados aparecerão aqui.
          </span>
        )}
      </ConfigPanel>

      <ConfigPanel
        id="color"
        panelProps={panelProps}
        title={
          <>
            Cor da ferramenta
            {activeTrackingStep ? ` · ${activeTrackingStep.code}` : ""}
          </>
        }
      >
        <ColorRow>
          {PALETTE_COLORS.map((c) => (
            <ColorSwatch
              key={c}
              $color={c}
              $active={currentColor === c}
              onClick={() => applyTrackingColor(c)}
              aria-label={`Selecionar cor ${c}`}
              title={`Selecionar cor ${c}`}
            />
          ))}
        </ColorRow>
        <input
          aria-label="Escolher cor personalizada"
          type="color"
          value={currentColor}
          onChange={(e) => applyTrackingColor(e.target.value)}
          style={{
            width: "100%",
            height: 32,
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            background: "transparent",
          }}
        />
      </ConfigPanel>

      {selectedItem && (
        <ConfigPanel
          id="link"
          panelProps={panelProps}
          title="Vínculo do elemento selecionado"
        >
          <SelectInput
            value={selectedItem.trackingStepId ?? ""}
            aria-label="Vincular elemento a um passo"
            onChange={(event) =>
              assignSelectedItemToTrackingStep(event.target.value || null)
            }
          >
            <option value="">Sem rastreamento</option>
            {trackingSteps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.code} · {step.name}
              </option>
            ))}
          </SelectInput>
        </ConfigPanel>
      )}

      <ConfigPanel
        id="stroke"
        panelProps={panelProps}
        title={`Espessura: ${strokeWidth}px`}
      >
        <SliderInput
          aria-label="Espessura do traço"
          type="range"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
        />
      </ConfigPanel>

      {(tool === "rectangle" ||
        (selectedId &&
          items.find((i) => i.id === selectedId)?.tool === "rectangle")) && (
        <ConfigPanel id="rectangle" panelProps={panelProps} title="Retângulo">
          <PanelLabel style={{ marginTop: 4 }}>Cor da borda</PanelLabel>
          <ColorRow>
            {PALETTE_COLORS.map((c) => (
              <ColorSwatch
                key={`rect-stroke-${c}`}
                $color={c}
                $active={rectStrokeColor === c}
                onClick={() =>
                  activeTrackingStep
                    ? applyTrackingColor(c)
                    : setRectStrokeColor(c)
                }
              />
            ))}
          </ColorRow>
          <PanelLabel style={{ marginTop: 4 }}>Cor de preenchimento</PanelLabel>
          <ColorRow>
            <ColorSwatch
              $color="transparent"
              $active={rectFillColor === "transparent"}
              onClick={() => setRectFillColor("transparent")}
              style={{
                background:
                  "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 16px 16px",
              }}
            />
            {PALETTE_COLORS.map((c) => (
              <ColorSwatch
                key={`rect-fill-${c}`}
                $color={c}
                $active={rectFillColor === c}
                onClick={() => setRectFillColor(c)}
              />
            ))}
          </ColorRow>
          <PanelLabel style={{ marginTop: 4 }}>
            Opacidade preenchimento: {Math.round(rectFillOpacity * 100)}%
          </PanelLabel>
          <SliderInput
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={rectFillOpacity}
            onChange={(e) => setRectFillOpacity(Number(e.target.value))}
          />
        </ConfigPanel>
      )}

      {(tool === "text" ||
        (selectedId &&
          items.find((i) => i.id === selectedId)?.tool === "text")) && (
        <ConfigPanel id="text" panelProps={panelProps} title="Texto">
          <TextareaInput
            aria-label="Texto a inserir"
            placeholder="Digite o texto..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <PanelLabel>Tamanho: {fontSize}px</PanelLabel>
          <SliderInput
            aria-label="Tamanho do texto"
            type="range"
            min={10}
            max={72}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
          <SelectInput
            aria-label="Peso da fonte"
            value={fontWeight}
            onChange={(e) => setFontWeight(e.target.value as "normal" | "bold")}
          >
            <option value="normal">Normal</option>
            <option value="bold">Negrito</option>
          </SelectInput>
        </ConfigPanel>
      )}

      {selectedItem &&
        (selectedItem.tool === "rectangle" || selectedItem.tool === "text") && (
          <ConfigPanel
            id="rotation"
            panelProps={panelProps}
            title={`${selectedItem.tool === "rectangle" ? (selectedItem.imageDataUrl ? "Imagem" : "Retângulo") : "Texto"} Selecionado`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <RotateCcw size={14} color="currentColor" />
              <PanelLabel style={{ flex: 1, textTransform: "none" }}>
                Rotação: {(selectedItem as RectShape | TextShape).rotation || 0}
                °
              </PanelLabel>
              <Button variant="ghost" size="sm" onClick={resetRotation}>
                Reset
              </Button>
            </div>
            <SliderInput
              type="range"
              min={0}
              max={359}
              value={(selectedItem as RectShape | TextShape).rotation || 0}
              onChange={(e) => handleRotationChange(Number(e.target.value))}
              onMouseUp={commitRotationChange}
              onTouchEnd={commitRotationChange}
            />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {[0, 45, 90, 180, 270, 315].map((deg) => (
                <Button
                  key={deg}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    handleRotationChange(deg);
                    commitRotationChange();
                  }}
                >
                  {deg}°
                </Button>
              ))}
            </div>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => {
                const newItems = items.filter((it) => it.id !== selectedId);
                pushHistory(newItems);
                setSelectedId(null);
              }}
            >
              Remover
            </Button>
          </ConfigPanel>
        )}

      {tool === "crop" && cropArea && (
        <ConfigPanel id="crop" panelProps={panelProps} title="Crop">
          <span style={{ fontSize: 12, color: "var(--foreground)" }}>
            {Math.round(cropArea.w)} × {Math.round(cropArea.h)}px
          </span>
          <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
            Arraste no canvas para definir a área
          </span>
        </ConfigPanel>
      )}

      <ConfigPanel
        id="zoom"
        panelProps={panelProps}
        title={`Zoom: ${Math.round(zoom * 100)}%`}
      >
        <SliderInput
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
      </ConfigPanel>
    </RightPanel>
  );
}
