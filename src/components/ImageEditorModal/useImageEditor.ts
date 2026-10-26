import type { ImageEditorProps } from "./types";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  drawStroke,
  drawText,
  drawRect as renderRect,
} from "./canvasRendering";
import { useEditorHistory } from "./useEditorHistory";
import { useImageExport } from "./useImageExport";
import { useScreenCapture } from "./useScreenCapture";
import { useRef, useState, useCallback, useEffect } from "react";

import type {
  CanvasItem,
  DrawPoint,
  RectShape,
  ResizeState,
  RotateState,
  Stroke,
  TextShape,
  Tool,
  TrackingStep,
} from "./types";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_STROKE_WIDTH,
  HANDLE_SIZE,
  MAX_IMAGE_BYTES,
  MAX_ZOOM,
  MIN_CROP_DIM,
  MIN_ZOOM,
  PALETTE_COLORS,
  ROTATE_HANDLE_OFFSET,
} from "./constants";
import {
  applyResize,
  applyTrackingColorToItem,
  clamp,
  getSelectableBounds,
  getTextDimensions,
  hitTestResizeHandle,
  hitTestRotateHandle,
  pointInStroke,
  pointInText,
  pointInTransformedRect,
  toDeg,
  toRad,
  uid,
} from "./geometry";

import { type ConfigPanelId } from "./components/ConfigPanel";

const DEFAULT_PANEL_ORDER: ConfigPanelId[] = [
  "canvas",
  "items",
  "color",
  "link",
  "stroke",
  "rectangle",
  "text",
  "rotation",
  "crop",
  "zoom",
];

export function useImageEditor({
  open,
  onOpenChange,
  initialImage = null,
  initialItems,
  initialTrackingSteps,
  onExport,
  onConfirm,
  onConfirmDocument,
  onSendToTicket,
  sendToTicketLabel = "Enviar para chamado",
  hideExport = false,
  portalContainer,
}: ImageEditorProps) {
  /* ── image ── */
  const [imageSrc, setImageSrc] = useState<string | null>(initialImage ?? null);
  const [imageDimensions, setImageDimensions] = useState<{
    w: number;
    h: number;
  }>({
    w: 0,
    h: 0,
  });

  /* ── tool ── */
  const [tool, setTool] = useState<Tool>("select");
  const [currentColor, setCurrentColor] = useState<string>(
    PALETTE_COLORS[0] ?? "#000000",
  );
  const [strokeWidth, setStrokeWidth] = useState<number>(DEFAULT_STROKE_WIDTH);
  const [fontSize, setFontSize] = useState<number>(DEFAULT_FONT_SIZE);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("bold");
  const [rectFillColor, setRectFillColor] = useState<string>("transparent");
  const [rectStrokeColor, setRectStrokeColor] = useState<string>(
    PALETTE_COLORS[1] ?? "#0EA5E9",
  );
  const [rectFillOpacity, setRectFillOpacity] = useState<number>(0.15);

  /* ── items ── */
  const [items, setItems] = useState<CanvasItem[]>([]);
  const layerImages = useRef(new Map<string, HTMLImageElement>());
  const [layerRevision, setLayerRevision] = useState(0);

  useEffect(() => {
    const cleanups: Array<() => void> = [];

    for (const item of items) {
      if (item.tool !== "rectangle" || !item.imageDataUrl) continue;
      let image = layerImages.current.get(item.imageDataUrl);

      if (!image) {
        image = new Image();
        layerImages.current.set(item.imageDataUrl, image);
        image.src = item.imageDataUrl;
      }

      if (image.complete && image.naturalWidth) continue;
      const loaded = () => setLayerRevision((value) => value + 1);

      image.addEventListener("load", loaded);
      cleanups.push(() => image.removeEventListener("load", loaded));
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [items]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* ── tracked editing steps ── */
  const [trackingSteps, setTrackingSteps] = useState<TrackingStep[]>([]);
  const [activeTrackingStepId, setActiveTrackingStepId] = useState<
    string | null
  >(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingName, setTrackingName] = useState("");
  const [trackingDescription, setTrackingDescription] = useState("");
  const [trackingDraftColor, setTrackingDraftColor] = useState(
    PALETTE_COLORS[0],
  );
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [includeTrackingOverlay, setIncludeTrackingOverlay] = useState(true);

  /* ── drawing state ── */
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [currentStroke, setCurrentStroke] = useState<DrawPoint[]>([]);
  const [currentRect, setCurrentRect] = useState<RectShape | null>(null);

  /* ── resize / rotate ── */
  const [isResizing, setIsResizing] = useState(false);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateState, setRotateState] = useState<RotateState | null>(null);

  /* ── crop ── */
  const [cropArea, setCropArea] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [isCropDragging, setIsCropDragging] = useState(false);
  const [cropDragStart, setCropDragStart] = useState<{
    x: number;
    y: number;
  } | null>(null);

  /* ── text input ── */
  const [textInput, setTextInput] = useState(
    "Altere o texto no painel de configuração.",
  );

  /* ── ui ── */
  const [isDragOver, setIsDragOver] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const [panelOrder, setPanelOrder] =
    useState<ConfigPanelId[]>(DEFAULT_PANEL_ORDER);
  const [draggedPanel, setDraggedPanel] = useState<ConfigPanelId | null>(null);

  const reorderPanel = useCallback(
    (targetPanel: ConfigPanelId) => {
      if (!draggedPanel || draggedPanel === targetPanel) return;
      setPanelOrder((previous) => {
        const next = [...previous];
        const fromIndex = next.indexOf(draggedPanel);
        const toIndex = next.indexOf(targetPanel);

        if (fromIndex < 0 || toIndex < 0) return previous;
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggedPanel);

        return next;
      });
      setDraggedPanel(null);
    },
    [draggedPanel],
  );

  const panelProps = useCallback(
    (id: ConfigPanelId) => ({
      "data-panel-id": id,
      draggable: true,
      style: { order: panelOrder.indexOf(id) },
      onDragStart: () => setDraggedPanel(id),
      onDragOver: (event: React.DragEvent<HTMLDetailsElement>) =>
        event.preventDefault(),
      onDrop: () => reorderPanel(id),
      onDragEnd: () => setDraggedPanel(null),
    }),
    [panelOrder, reorderPanel],
  );

  const {
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    pushHistory,
    undo,
    redo,
  } = useEditorHistory({
    sourceImageRef,
    imageSrc,
    setItems,
    setImageSrc,
    setImageDimensions,
    setCropArea,
    setTool,
    setSelectedId,
  });

  const applyTrackingColor = useCallback(
    (color: string) => {
      setCurrentColor(color);
      setRectStrokeColor(color);
      if (activeTrackingStepId) {
        setTrackingSteps((previous) =>
          previous.map((step) =>
            step.id === activeTrackingStepId ? { ...step, color } : step,
          ),
        );
        setItems((previous) =>
          previous.map((item) =>
            item.trackingStepId === activeTrackingStepId
              ? applyTrackingColorToItem(item, color)
              : item,
          ),
        );
        setHistory((previous) =>
          previous.map((snapshot) => ({
            ...snapshot,
            items: snapshot.items.map((item) =>
              item.trackingStepId === activeTrackingStepId
                ? applyTrackingColorToItem(item, color)
                : item,
            ),
          })),
        );
        setCurrentRect((previous) =>
          previous?.trackingStepId === activeTrackingStepId
            ? (applyTrackingColorToItem(previous, color) as RectShape)
            : previous,
        );
      }
    },
    [activeTrackingStepId],
  );

  const activateTrackingStep = useCallback((step: TrackingStep) => {
    setActiveTrackingStepId(step.id);
    setCurrentColor(step.color);
    setRectStrokeColor(step.color);
    setTrackingError(null);
  }, []);

  const createTrackingStep = useCallback(() => {
    const code = trackingCode.trim();
    const name = trackingName.trim();

    if (!code || !name) {
      setTrackingError("Informe um ID e um nome para o passo.");

      return;
    }

    if (
      trackingSteps.some(
        (step) =>
          step.code.toLocaleLowerCase("pt-BR") ===
          code.toLocaleLowerCase("pt-BR"),
      )
    ) {
      setTrackingError("Já existe um passo com esse ID.");

      return;
    }

    const step: TrackingStep = {
      id: `tracking_${uid()}`,
      code,
      name,
      description: trackingDescription.trim(),
      color: trackingDraftColor || "#0EA5E9",
    };

    setTrackingSteps((previous) => [...previous, step]);
    setActiveTrackingStepId(step.id);
    setCurrentColor(step.color);
    setRectStrokeColor(step.color);
    setTrackingCode("");
    setTrackingName("");
    setTrackingDescription("");
    setTrackingError(null);
  }, [
    trackingCode,
    trackingDescription,
    trackingDraftColor,
    trackingName,
    trackingSteps,
  ]);

  /* ── history helper ── */
  /* ── load initial image ── */
  const loadImage = useCallback(
    (
      src: string,
      nextItems: CanvasItem[] = [],
      nextTrackingSteps: TrackingStep[] = [],
    ) => {
      const img = new Image();

      setIsLoadingImage(true);
      setImageError(null);
      if (!src.startsWith("data:") && !src.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }

      img.onload = () => {
        sourceImageRef.current = img;
        setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
        setImageSrc(src);
        setItems(nextItems);
        setHistory([
          {
            items: nextItems,
            src,
            image: img,
            dimensions: { w: img.naturalWidth, h: img.naturalHeight },
          },
        ]);
        setHistoryIndex(0);
        setSelectedId(null);
        setTrackingSteps(nextTrackingSteps);
        setActiveTrackingStepId(null);
        setTrackingCode("");
        setTrackingName("");
        setTrackingDescription("");
        setTrackingDraftColor(PALETTE_COLORS[0]);
        setTrackingError(null);
        setCropArea(null);
        setIsLoadingImage(false);
      };

      img.onerror = () => {
        setIsLoadingImage(false);
        setImageError(
          "Não foi possível abrir a imagem. Verifique o arquivo ou a permissão CORS da URL.",
        );
      };

      img.src = src;
    },
    [],
  );

  const resetEditor = useCallback(() => {
    setImageSrc(null);
    sourceImageRef.current = null;
    setImageDimensions({ w: 0, h: 0 });
    setItems([]);
    setHistory([
      { items: [], src: null, image: null, dimensions: { w: 0, h: 0 } },
    ]);
    setHistoryIndex(0);
    setSelectedId(null);
    setTrackingSteps([]);
    setActiveTrackingStepId(null);
    setTrackingCode("");
    setTrackingName("");
    setTrackingDescription("");
    setTrackingDraftColor(PALETTE_COLORS[0]);
    setTrackingError(null);
    setCropArea(null);
    setCurrentStroke([]);
    setCurrentRect(null);
    setTool("select");
    setZoom(1);
    setImageError(null);
    setIsLoadingImage(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialImage)
      loadImage(initialImage, initialItems ?? [], initialTrackingSteps ?? []);
    else resetEditor();
  }, [
    initialImage,
    initialItems,
    initialTrackingSteps,
    loadImage,
    open,
    resetEditor,
  ]);

  const fitImageToArea = useCallback(() => {
    const area = canvasAreaRef.current;

    if (!area || !imageDimensions.w || !imageDimensions.h) return;
    const availableWidth = Math.max(1, area.clientWidth - 40);
    const availableHeight = Math.max(1, area.clientHeight - 40);

    setZoom(
      clamp(
        Math.min(
          1,
          availableWidth / imageDimensions.w,
          availableHeight / imageDimensions.h,
        ),
        MIN_ZOOM,
        MAX_ZOOM,
      ),
    );
  }, [imageDimensions.h, imageDimensions.w]);

  useEffect(() => {
    if (!open || !imageSrc) return;
    const frame = window.requestAnimationFrame(fitImageToArea);
    const area = canvasAreaRef.current;
    const observer =
      area && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(fitImageToArea)
        : null;

    if (area && observer) observer.observe(area);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [fitImageToArea, imageSrc, open]);

  /* ── file handling ── */
  const pasteQueue = useRef(Promise.resolve());
  const pasteState = useRef({ items, pushHistory, imageDimensions });

  pasteState.current = { items, pushHistory, imageDimensions };
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Selecione um arquivo de imagem válido.");

      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("A imagem deve ter no máximo 20 MB.");

      return;
    }

    pasteQueue.current = pasteQueue.current
      .then(async () => {
        const bitmap = new Image();
        const sourceUrl = URL.createObjectURL(file);

        bitmap.src = sourceUrl;
        try {
          await bitmap.decode();
        } finally {
          URL.revokeObjectURL(sourceUrl);
        }

        const normalized = document.createElement("canvas");

        normalized.width = bitmap.width;
        normalized.height = bitmap.height;
        normalized.getContext("2d")!.drawImage(bitmap, 0, 0);
        const dataUrl = normalized.toDataURL("image/png");
        const image = new Image();

        image.src = dataUrl;
        await image.decode();
        layerImages.current.set(dataUrl, image);
        const state = pasteState.current;
        const hasBase = !!sourceImageRef.current;
        const width = hasBase ? state.imageDimensions.w : normalized.width;
        const height = hasBase ? state.imageDimensions.h : normalized.height;
        const scale = Math.min(
          1,
          width / normalized.width,
          height / normalized.height,
        );
        const layer: RectShape = {
          id: `paste_${uid()}`,
          tool: "rectangle",
          imageDataUrl: dataUrl,
          imageName: file.name || "Imagem colada",
          x: (width - normalized.width * scale) / 2,
          y: (height - normalized.height * scale) / 2,
          width: normalized.width * scale,
          height: normalized.height * scale,
          fillColor: "transparent",
          strokeColor: "transparent",
          strokeWidth: 0,
          fillOpacity: 1,
          rotation: 0,
        };

        if (!hasBase) {
          normalized
            .getContext("2d")!
            .clearRect(0, 0, normalized.width, normalized.height);
          const blank = normalized.toDataURL("image/png");
          const base = new Image();

          base.src = blank;
          await base.decode();
          state.pushHistory([layer], base, blank);
        } else state.pushHistory([...state.items, layer]);
        setSelectedId(layer.id);
        setTool("select");
        setImageError(null);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      })
      .catch((error) =>
        setImageError(
          `Não foi possível adicionar a imagem como camada: ${error instanceof Error ? error.message : "arquivo inválido"}`,
        ),
      );
  }, []);

  /* ── clipboard paste ── */
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData!.items;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();

          if (file) {
            e.preventDefault();
            handleFile(file);
          }
        }
      }
    },
    [handleFile],
  );

  const { capturingScreen, handleCaptureScreen } = useScreenCapture(
    open,
    loadImage,
    setImageError,
    portalContainer?.ownerDocument.defaultView ?? window,
  );

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (
        !(portalContainer?.ownerDocument.defaultView ?? window).navigator
          .clipboard?.read
      ) {
        setImageError(
          "A colagem de imagem não está disponível neste navegador. Use Ctrl+V.",
        );

        return;
      }

      const clipboardItems = await (
        portalContainer?.ownerDocument.defaultView ?? window
      ).navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) =>
          type.startsWith("image/"),
        );

        if (!imageType) continue;
        const blob = await clipboardItem.getType(imageType);
        const extension = imageType.split("/")[1] || "png";

        handleFile(
          new File([blob], `imagem-colada-${Date.now()}.${extension}`, {
            type: imageType,
          }),
        );
        setImageError(null);

        return;
      }

      setImageError("Não há uma imagem na área de transferência.");
    } catch {
      setImageError(
        "Não foi possível acessar a área de transferência. Use Ctrl+V ou permita o acesso.",
      );
    }
  }, [handleFile, portalContainer]);

  useEffect(() => {
    if (!open) return undefined;

    const targetDocument = portalContainer?.ownerDocument ?? document;

    targetDocument.addEventListener("paste", handlePaste);

    return () => targetDocument.removeEventListener("paste", handlePaste);
  }, [open, handlePaste, portalContainer]);

  /* ── keyboard shortcuts ── */
  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isFormControl = target.matches(
        "input, textarea, select, [contenteditable='true']",
      );

      if (isFormControl && e.key !== "Escape") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }

      if (e.key === "Delete" && selectedId) {
        const newItems = items.filter((it) => it.id !== selectedId);

        pushHistory(newItems);
        setSelectedId(null);
      }

      if (e.key === "Escape") {
        setSelectedId(null);
        setCurrentRect(null);
        setCropArea(null);
      }

      if (e.key === "r" && selectedId && !e.ctrlKey && !e.metaKey) {
        const newItems = items.map((item) => {
          if (item.id !== selectedId) return item;
          if (item.tool === "rectangle" || item.tool === "text") {
            return { ...item, rotation: (item.rotation + 15) % 360 };
          }

          return item;
        });

        pushHistory(newItems);
      }
    },
    [undo, redo, selectedId, items, pushHistory],
  );

  /* ── canvas coordinate helpers ── */
  const getCanvasCoords = useCallback(
    (e: { clientX: number; clientY: number }): { x: number; y: number } => {
      const wrapper = wrapperRef.current;

      if (!wrapper) return { x: 0, y: 0 };
      const rect = wrapper.getBoundingClientRect();

      return {
        x: clamp((e.clientX - rect.left) / zoom, 0, imageDimensions.w),
        y: clamp((e.clientY - rect.top) / zoom, 0, imageDimensions.h),
      };
    },
    [imageDimensions.h, imageDimensions.w, zoom],
  );

  /* ── draw helpers ── */
  const drawRect = useCallback(
    (ctx: CanvasRenderingContext2D, rect: RectShape) =>
      renderRect(ctx, rect, layerImages.current),
    [],
  );

  function drawSelectionHandles(
    ctx: CanvasRenderingContext2D,
    item: RectShape | TextShape,
  ) {
    const { x, y, width, height, rotation } = getSelectableBounds(item, ctx);
    const cx = x + width / 2;
    const cy = y + height / 2;
    const cos = Math.cos(toRad(rotation));
    const sin = Math.sin(toRad(rotation));

    ctx.save();
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);

    const corners = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];

    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const p = corners[i];
      const rx = (p!.x - cx) * cos - (p!.y - cy) * sin + cx;
      const ry = (p!.x - cx) * sin + (p!.y - cy) * cos + cy;

      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }

    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    const handles: { lx: number; ly: number }[] = [
      { lx: x, ly: y },
      { lx: x + width / 2, ly: y },
      { lx: x + width, ly: y },
      { lx: x + width, ly: y + height / 2 },
      { lx: x + width, ly: y + height },
      { lx: x + width / 2, ly: y + height },
      { lx: x, ly: y + height },
      { lx: x, ly: y + height / 2 },
    ];

    const hs = HANDLE_SIZE / zoom;

    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 2 / zoom;

    for (const h of handles) {
      const rx = (h.lx - cx) * cos - (h.ly - cy) * sin + cx;
      const ry = (h.lx - cx) * sin + (h.ly - cy) * cos + cy;

      ctx.beginPath();
      ctx.arc(rx, ry, hs / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    const rotLx = cx;
    const rotLy = y - ROTATE_HANDLE_OFFSET;
    const rotRx = (rotLx - cx) * cos - (rotLy - cy) * sin + cx;
    const rotRy = (rotLx - cx) * sin + (rotLy - cy) * cos + cy;
    const topRx = (cx - cx) * cos - (y - cy) * sin + cx;
    const topRy = (cx - cx) * sin + (y - cy) * cos + cy;

    ctx.beginPath();
    ctx.moveTo(topRx, topRy);
    ctx.lineTo(rotRx, rotRy);
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rotRx, rotRy, (hs + 4) / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#e94560";
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(rotRx, rotRy, hs / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ── full redraw ── */
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    const dpr =
      canvasRef.current?.ownerDocument.defaultView?.devicePixelRatio || 1;
    const w = imageDimensions.w;
    const h = imageDimensions.h;

    const pixelWidth = Math.round(w * dpr);
    const pixelHeight = Math.round(h * dpr);
    const cssWidth = `${w * zoom}px`;
    const cssHeight = `${h * zoom}px`;

    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    if (canvas.style.width !== cssWidth) canvas.style.width = cssWidth;
    if (canvas.style.height !== cssHeight) canvas.style.height = cssHeight;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (sourceImageRef.current) {
      ctx.drawImage(sourceImageRef.current, 0, 0, w, h);
    }

    drawAllItems(ctx);
  }, [
    imageSrc,
    imageDimensions,
    zoom,
    items,
    currentStroke,
    currentRect,
    selectedId,
    layerRevision,
  ]);

  const drawAllItems = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (const item of items) {
        if (item.tool === "pen" || item.tool === "eraser")
          drawStroke(ctx, item as Stroke);
        else if (item.tool === "rectangle") drawRect(ctx, item as RectShape);
        else if (item.tool === "text") drawText(ctx, item as TextShape);
      }

      if (currentStroke.length > 0) {
        drawStroke(ctx, {
          id: "temp",
          tool: tool as "pen" | "eraser",
          points: currentStroke,
          color: currentColor,
          width: strokeWidth,
        });
      }

      if (currentRect) drawRect(ctx, currentRect);

      if (selectedId && tool === "select") {
        const sel = items.find((i) => i.id === selectedId);

        if (sel && (sel.tool === "rectangle" || sel.tool === "text")) {
          drawSelectionHandles(ctx, sel as RectShape | TextShape);
        }
      }
    },
    [
      items,
      currentStroke,
      currentRect,
      currentColor,
      strokeWidth,
      tool,
      selectedId,
      zoom,
    ],
  );

  useEffect(() => {
    if (
      imageSrc ||
      items.length > 0 ||
      currentStroke.length > 0 ||
      currentRect
    ) {
      redrawCanvas();
    }
  }, [redrawCanvas]);

  /* ── mouse handlers ── */
  const handleMouseDown = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = getCanvasCoords(e);

      if (tool === "select" && selectedId) {
        const sel = items.find((i) => i.id === selectedId);

        if (sel && (sel.tool === "rectangle" || sel.tool === "text")) {
          const context = canvasRef.current?.getContext("2d");

          if (!context) return;
          const {
            width: w,
            height: h,
            rotation,
            x: rx,
            y: ry,
          } = getSelectableBounds(sel, context);

          if (hitTestRotateHandle(x, y, rx, ry, w, h, rotation)) {
            setIsRotating(true);
            setRotateState({
              startMouse: { x, y },
              startRotation: rotation,
              centerX: rx + w / 2,
              centerY: ry + h / 2,
            });

            return;
          }

          const hitHandle = hitTestResizeHandle(x, y, rx, ry, w, h, rotation);

          if (hitHandle) {
            setIsResizing(true);
            setResizeState({
              handle: hitHandle,
              startMouse: { x, y },
              startBounds: { x: rx, y: ry, width: w, height: h },
            });

            return;
          }

          const hit =
            sel.tool === "rectangle"
              ? pointInTransformedRect(x, y, rx, ry, w, h, rotation)
              : pointInText(x, y, sel as TextShape, context);

          if (hit) {
            setIsDragging(true);
            if (sel.tool === "rectangle") {
              setDragOffset({ x: x - rx, y: y - ry });
            } else {
              const dims = getTextDimensions(sel as TextShape, context);

              setDragOffset({
                x: x - (sel as TextShape).x,
                y: y - ((sel as TextShape).y - dims.h),
              });
            }

            return;
          }

          setSelectedId(null);

          return;
        }
      }

      if (tool === "select") {
        const ctx = canvasRef.current?.getContext("2d");

        if (!ctx) return;
        let foundId: string | null = null;

        for (let i = items.length - 1; i >= 0; i--) {
          const item = items[i];

          if (item!.tool === "rectangle") {
            if (
              pointInTransformedRect(
                x,
                y,
                item!.x,
                item!.y,
                item!.width,
                item!.height,
                item!.rotation || 0,
              )
            ) {
              foundId = item!.id;
              setDragOffset({ x: x - item!.x, y: y - item!.y });
              break;
            }
          } else if (item!.tool === "text") {
            if (pointInText(x, y, item!, ctx)) {
              foundId = item!.id;
              break;
            }
          } else if (item!.tool === "pen" || item!.tool === "eraser") {
            if (pointInStroke(x, y, item!)) {
              foundId = item!.id;
              const pts = item!.points;
              const minX = Math.min(...pts.map((p) => p!.x));
              const minY = Math.min(...pts.map((p) => p!.y));

              setDragOffset({ x: x - minX, y: y - minY });
              break;
            }
          }
        }

        setSelectedId(foundId);
        setIsDragging(!!foundId);

        return;
      }

      if (tool === "pen" || tool === "eraser") {
        setIsDrawing(true);
        setCurrentStroke([{ x, y, color: currentColor, width: strokeWidth }]);

        return;
      }

      if (tool === "rectangle") {
        setIsDragging(true);
        setDragStart({ x, y });
        setCurrentRect({
          id: uid(),
          ...(activeTrackingStepId
            ? { trackingStepId: activeTrackingStepId }
            : {}),
          tool: "rectangle",
          x,
          y,
          width: 0,
          height: 0,
          fillColor: rectFillColor,
          strokeColor: rectStrokeColor,
          strokeWidth,
          fillOpacity: rectFillOpacity,
          rotation: 0,
        });

        return;
      }

      if (tool === "text") {
        if (textInput.trim()) {
          const newText: TextShape = {
            id: uid(),
            ...(activeTrackingStepId
              ? { trackingStepId: activeTrackingStepId }
              : {}),
            tool: "text",
            x,
            y,
            text: textInput,
            color: currentColor,
            fontSize,
            fontWeight,
            rotation: 0,
          };

          pushHistory([...items, newText]);
          setSelectedId(newText.id);
        }

        return;
      }

      if (tool === "crop") {
        setIsCropDragging(true);
        setCropDragStart({ x, y });
        setCropArea({ x, y, w: 0, h: 0 });

        return;
      }
    },
    [
      tool,
      items,
      currentColor,
      strokeWidth,
      textInput,
      rectFillColor,
      rectStrokeColor,
      rectFillOpacity,
      fontSize,
      fontWeight,
      pushHistory,
      getCanvasCoords,
      selectedId,
      activeTrackingStepId,
    ],
  );

  const handleMouseMove = useCallback(
    (e: ReactPointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);

      if (isRotating && rotateState && selectedId) {
        const newAngle = toDeg(
          Math.atan2(y - rotateState.centerY, x - rotateState.centerX) -
            Math.atan2(
              rotateState.startMouse.y - rotateState.centerY,
              rotateState.startMouse.x - rotateState.centerX,
            ) +
            toRad(rotateState.startRotation),
        );
        const snappedAngle = e.shiftKey
          ? Math.round(newAngle / 5) * 5
          : newAngle;
        const newItems = items.map((item) => {
          if (item.id !== selectedId) return item;

          return { ...item, rotation: snappedAngle % 360 };
        });

        setItems(newItems);

        return;
      }

      if (isResizing && resizeState && selectedId) {
        const dx = x - resizeState.startMouse.x;
        const dy = y - resizeState.startMouse.y;
        const sel = items.find((i) => i.id === selectedId);

        if (sel && (sel.tool === "rectangle" || sel.tool === "text")) {
          const rotation = (sel as RectShape | TextShape).rotation || 0;
          const correctedBounds = applyResize(
            resizeState.startBounds,
            resizeState.handle,
            dx,
            dy,
            rotation,
          );
          const newItems = items.map((item) => {
            if (item.id !== selectedId) return item;
            if (item.tool === "rectangle") {
              return {
                ...item,
                x: correctedBounds.x,
                y: correctedBounds.y,
                width: correctedBounds.width,
                height: correctedBounds.height,
              } as RectShape;
            }

            if (item.tool === "text") {
              const heightRatio =
                correctedBounds.height / resizeState.startBounds.height;
              const newFontSize = Math.max(
                10,
                Math.min(
                  200,
                  Math.round((sel as TextShape).fontSize * heightRatio),
                ),
              );

              return {
                ...item,
                fontSize: newFontSize,
                x: correctedBounds.x,
                y: correctedBounds.y + correctedBounds.height,
              } as TextShape;
            }

            return item;
          });

          setItems(newItems);
        }

        return;
      }

      if ((tool === "pen" || tool === "eraser") && isDrawing) {
        setCurrentStroke((prev) => [
          ...prev,
          { x, y, color: currentColor, width: strokeWidth },
        ]);

        return;
      }

      if (tool === "rectangle") {
        if (isDragging && dragStart && currentRect) {
          const w = x - dragStart.x;
          const h = y - dragStart.y;

          setCurrentRect({
            ...currentRect,
            x: w < 0 ? x : dragStart.x,
            y: h < 0 ? y : dragStart.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        }

        return;
      }

      if (tool === "select" && isDragging && selectedId) {
        const newItems = items.map((item) => {
          if (item.id !== selectedId) return item;
          if (item.tool === "rectangle")
            return {
              ...item,
              x: x - dragOffset.x,
              y: y - dragOffset.y,
            } as RectShape;
          if (item.tool === "text") {
            const dims = getTextDimensions(
              item as TextShape,
              canvasRef.current!.getContext("2d")!,
            );

            return {
              ...item,
              x: x - dragOffset.x,
              y: y - dragOffset.y + dims.h,
            } as TextShape;
          }

          if (item.tool === "pen" || item.tool === "eraser") {
            const dx =
              x - dragOffset.x - Math.min(...item.points.map((p) => p.x));
            const dy =
              y - dragOffset.y - Math.min(...item.points.map((p) => p.y));

            return {
              ...item,
              points: item.points.map((p) => ({
                ...p,
                x: p.x + dx,
                y: p.y + dy,
              })),
            };
          }

          return item;
        });

        setItems(newItems);

        return;
      }

      if (tool === "crop") {
        if (isCropDragging && cropDragStart) {
          const w = x - cropDragStart.x;
          const h = y - cropDragStart.y;

          setCropArea({
            x: w < 0 ? x : cropDragStart.x,
            y: h < 0 ? y : cropDragStart.y,
            w: Math.abs(w),
            h: Math.abs(h),
          });
        }

        return;
      }
    },
    [
      tool,
      isDrawing,
      isDragging,
      isCropDragging,
      isResizing,
      isRotating,
      currentColor,
      strokeWidth,
      dragStart,
      dragOffset,
      currentRect,
      selectedId,
      items,
      cropDragStart,
      resizeState,
      rotateState,
      getCanvasCoords,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if ((tool === "pen" || tool === "eraser") && isDrawing) {
      if (currentStroke.length > 1) {
        const stroke: Stroke = {
          id: uid(),
          ...(activeTrackingStepId
            ? { trackingStepId: activeTrackingStepId }
            : {}),
          tool: tool as "pen" | "eraser",
          points: currentStroke,
          color: currentColor,
          width: strokeWidth,
        };

        pushHistory([...items, stroke]);
      }

      setCurrentStroke([]);
      setIsDrawing(false);

      return;
    }

    if (tool === "rectangle") {
      if (currentRect && currentRect.width > 2 && currentRect.height > 2) {
        pushHistory([...items, currentRect]);
        setSelectedId(currentRect.id);
      }

      setCurrentRect(null);
      setIsDragging(false);
      setDragStart(null);

      return;
    }

    if (tool === "select" && isDragging) {
      pushHistory(items);
      setIsDragging(false);

      return;
    }

    if (isResizing) {
      pushHistory(items);
      setIsResizing(false);
      setResizeState(null);

      return;
    }

    if (isRotating) {
      pushHistory(items);
      setIsRotating(false);
      setRotateState(null);

      return;
    }

    if (tool === "crop") {
      if (!cropArea || cropArea.w < MIN_CROP_DIM || cropArea.h < MIN_CROP_DIM)
        setCropArea(null);
      setIsCropDragging(false);
      setCropDragStart(null);

      return;
    }
  }, [
    tool,
    isDrawing,
    isDragging,
    isResizing,
    isRotating,
    isCropDragging,
    currentStroke,
    currentRect,
    currentColor,
    strokeWidth,
    items,
    cropArea,
    pushHistory,
    activeTrackingStepId,
  ]);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      handleMouseUp();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [handleMouseUp],
  );

  /* ── drag & drop from OS ── */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;

      if (files.length > 0) handleFile(files[0]!);
    },
    [handleFile],
  );

  /* ── export / confirm ── */
  const { handleSendToTicket, handleExport, handleScreenshot, handleConfirm } =
    useImageExport({
      imageDimensions,
      sourceImageRef,
      includeTrackingOverlay,
      items,
      trackingSteps,
      layerImages,
      canvasRef,
      drawStroke,
      drawRect,
      drawText,
      onSendToTicket,
      onExport,
      onConfirm,
      onConfirmDocument,
      setImageError,
    });

  /* ── apply crop ── */
  const applyCrop = useCallback(() => {
    if (!cropArea || cropArea.w < MIN_CROP_DIM || cropArea.h < MIN_CROP_DIM)
      return;
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    if (!tempCtx) return;
    tempCanvas.width = cropArea.w;
    tempCanvas.height = cropArea.h;
    if (!sourceImageRef.current) return;
    tempCtx.drawImage(
      sourceImageRef.current,
      cropArea.x,
      cropArea.y,
      cropArea.w,
      cropArea.h,
      0,
      0,
      cropArea.w,
      cropArea.h,
    );
    const croppedDataUrl = tempCanvas.toDataURL("image/png");
    const croppedItems = items.map((item) =>
      item.tool === "rectangle"
        ? { ...item, x: item.x - cropArea.x, y: item.y - cropArea.y }
        : item.tool === "text"
          ? { ...item, x: item.x - cropArea.x, y: item.y - cropArea.y }
          : {
              ...item,
              points: item.points.map((point) => ({
                ...point,
                x: point.x - cropArea.x,
                y: point.y - cropArea.y,
              })),
            },
    );
    const croppedImage = new Image();

    setIsLoadingImage(true);
    croppedImage.onload = () => {
      pushHistory(croppedItems, croppedImage, croppedDataUrl);
      setCropArea(null);
      setTool("select");
      setIsLoadingImage(false);
    };

    croppedImage.onerror = () => {
      setImageError("Não foi possível aplicar o recorte.");
      setIsLoadingImage(false);
    };

    croppedImage.src = croppedDataUrl;
  }, [cropArea, items, pushHistory]);

  const [canvasWidth, setCanvasWidth] = useState("1200");
  const [canvasHeight, setCanvasHeight] = useState("800");

  useEffect(() => {
    if (imageDimensions.w && imageDimensions.h) {
      setCanvasWidth(String(imageDimensions.w));
      setCanvasHeight(String(imageDimensions.h));
    }
  }, [imageDimensions.w, imageDimensions.h]);

  const resizeCanvas = async () => {
    const width = Number(canvasWidth),
      height = Number(canvasHeight);

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width > 8192 ||
      height > 8192 ||
      width * height > 16777216
    ) {
      setImageError(
        "Informe dimensões inteiras entre 1 e 8192 px, com no máximo 16 megapixels.",
      );

      return;
    }

    if (
      isLoadingImage ||
      (width === imageDimensions.w && height === imageDimensions.h)
    )
      return;
    setIsLoadingImage(true);
    try {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Canvas indisponível.");
      // Amplia a base sem escalar nem rasterizar as camadas editaveis.
      if (sourceImageRef.current)
        context.drawImage(sourceImageRef.current, 0, 0);
      const src = canvas.toDataURL("image/png");
      const image = new Image();

      image.src = src;
      await image.decode();
      pushHistory(items, image, src);
      setCropArea(null);
      setImageError(null);
    } catch {
      setImageError("Não foi possível ajustar a área editável.");
    } finally {
      setIsLoadingImage(false);
    }
  };

  /* ── reset rotation ── */
  const resetRotation = useCallback(() => {
    if (!selectedId) return;
    const newItems = items.map((item) => {
      if (item.id !== selectedId) return item;
      if (item.tool === "rectangle" || item.tool === "text")
        return { ...item, rotation: 0 } as RectShape | TextShape;

      return item;
    });

    pushHistory(newItems);
  }, [selectedId, items, pushHistory]);

  /* ── clear all ── */
  const clearAll = useCallback(() => {
    pushHistory([]);
    setSelectedId(null);
    setCropArea(null);
  }, [pushHistory]);

  /* ── upload ── */
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) handleFile(file);
    e.target.value = "";
  };

  /* ── selected item helpers ── */
  const selectedItem = selectedId
    ? items.find((i) => i.id === selectedId)
    : null;
  const activeTrackingStep = activeTrackingStepId
    ? (trackingSteps.find((step) => step.id === activeTrackingStepId) ?? null)
    : null;

  const assignSelectedItemToTrackingStep = (trackingStepId: string | null) => {
    if (!selectedId) return;
    const trackingStep = trackingSteps.find(
      (step) => step.id === trackingStepId,
    );
    const newItems = items.map((item) =>
      item.id === selectedId
        ? applyTrackingColorToItem(
            { ...item, trackingStepId: trackingStepId! ?? undefined },
            trackingStep?.color ??
              (item.tool === "rectangle"
                ? item.strokeColor
                : item.tool === "text" || item.tool === "pen"
                  ? item.color
                  : currentColor),
          )
        : item,
    );

    pushHistory(newItems);
  };

  const handleRotationChange = (deg: number) => {
    if (!selectedId) return;
    const newItems = items.map((item) => {
      if (item.id !== selectedId) return item;
      if (item.tool === "rectangle" || item.tool === "text")
        return { ...item, rotation: clamp(deg, 0, 359) } as
          RectShape | TextShape;

      return item;
    });

    setItems(newItems);
  };

  const commitRotationChange = () => {
    if (!selectedId) return;
    pushHistory(items);
  };

  return {
    imageSrc,
    imageDimensions,
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
    history,
    historyIndex,
    selectedId,
    setSelectedId,
    trackingSteps,
    setTrackingSteps,
    activeTrackingStepId,
    setActiveTrackingStepId,
    trackingCode,
    setTrackingCode,
    trackingName,
    setTrackingName,
    trackingDescription,
    setTrackingDescription,
    trackingDraftColor,
    setTrackingDraftColor,
    trackingError,
    includeTrackingOverlay,
    setIncludeTrackingOverlay,
    isDragging,
    cropArea,
    setCropArea,
    textInput,
    setTextInput,
    isDragOver,
    zoom,
    setZoom,
    imageError,
    isLoadingImage,
    canvasRef,
    canvasAreaRef,
    wrapperRef,
    fileInputRef,
    panelProps,
    applyTrackingColor,
    activateTrackingStep,
    createTrackingStep,
    pushHistory,
    undo,
    redo,
    fitImageToArea,
    capturingScreen,
    handleCaptureScreen,
    handlePasteFromClipboard,
    handleKeyDown,
    handleMouseDown,
    handleMouseMove,
    handlePointerUp,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSendToTicket,
    handleExport,
    handleScreenshot,
    handleConfirm,
    applyCrop,
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    resizeCanvas,
    resetRotation,
    clearAll,
    handleUploadClick,
    handleUploadChange,
    selectedItem,
    activeTrackingStep,
    assignSelectedItemToTrackingStep,
    handleRotationChange,
    commitRotationChange,
  };
}

export type ImageEditorController = ReturnType<typeof useImageEditor>;
