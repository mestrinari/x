import { useCallback, type RefObject } from "react";
import type { TicketImageEvidence } from "./ticketImageEvidence";
import type {
  CanvasItem,
  Stroke,
  RectShape,
  TextShape,
  TrackingStep,
  ImageEditorProps,
} from "./types";
import { clamp, getTrackingAnchor } from "./geometry";
import { drawTrackingExportOverlay } from "./trackingExport";

type Props = {
  imageDimensions: { w: number; h: number };
  sourceImageRef: RefObject<HTMLImageElement | null>;
  includeTrackingOverlay: boolean;
  items: CanvasItem[];
  trackingSteps: TrackingStep[];
  layerImages: RefObject<Map<string, HTMLImageElement>>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  drawStroke: (ctx: CanvasRenderingContext2D, item: Stroke) => void;
  drawRect: (ctx: CanvasRenderingContext2D, item: RectShape) => void;
  drawText: (ctx: CanvasRenderingContext2D, item: TextShape) => void;
  onSendToTicket: ImageEditorProps["onSendToTicket"];
  onExport: ImageEditorProps["onExport"];
  onConfirm: ImageEditorProps["onConfirm"];
  onConfirmDocument: ImageEditorProps["onConfirmDocument"];
  setImageError: (error: string | null) => void;
};

export function useImageExport({
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
}: Props) {
  const createFinalDataUrl = useCallback(
    (withTrackingOverlay = includeTrackingOverlay) => {
      if (!imageDimensions.w || !imageDimensions.h || !sourceImageRef.current) {
        throw new Error("Carregue uma imagem antes de exportar.");
      }

      const output = document.createElement("canvas");

      output.width = imageDimensions.w;
      output.height = imageDimensions.h;
      const context = output.getContext("2d");

      if (!context) throw new Error("O navegador não disponibilizou o canvas.");
      context.drawImage(
        sourceImageRef.current,
        0,
        0,
        output.width,
        output.height,
      );
      for (const item of items) {
        if (item.tool === "pen" || item.tool === "eraser")
          drawStroke(context, item);
        else if (item.tool === "rectangle") drawRect(context, item);
        else if (item.tool === "text") drawText(context, item);
      }

      if (withTrackingOverlay) {
        drawTrackingExportOverlay(
          context,
          output.width,
          output.height,
          trackingSteps,
          items,
        );
      }

      return output.toDataURL("image/png");
    },
    [
      imageDimensions.h,
      imageDimensions.w,
      includeTrackingOverlay,
      items,
      trackingSteps,
      drawStroke,
      drawRect,
      drawText,
      sourceImageRef,
    ],
  );

  const createBaseDataUrl = useCallback(() => {
    if (!imageDimensions.w || !imageDimensions.h || !sourceImageRef.current) {
      throw new Error("Carregue uma imagem antes de salvar.");
    }

    const output = document.createElement("canvas");

    output.width = imageDimensions.w;
    output.height = imageDimensions.h;
    const context = output.getContext("2d");

    if (!context) throw new Error("O navegador não disponibilizou o canvas.");
    context.drawImage(
      sourceImageRef.current,
      0,
      0,
      output.width,
      output.height,
    );

    return output.toDataURL("image/png");
  }, [imageDimensions.h, imageDimensions.w]);

  const createEvidence = useCallback((): TicketImageEvidence => {
    if (
      items.some(
        (item) =>
          item.tool === "rectangle" &&
          item.imageDataUrl &&
          !layerImages.current.get(item.imageDataUrl)?.naturalWidth,
      )
    )
      throw new Error(
        "Aguarde o carregamento das imagens coladas antes de salvar.",
      );
    const context = canvasRef.current?.getContext("2d");

    if (!context) throw new Error("O navegador não disponibilizou o canvas.");
    const evidenceId = `image_evidence_${Date.now()}`;

    return {
      id: evidenceId,
      imageDataUrl: createBaseDataUrl(),
      attachmentDataUrl: createFinalDataUrl(includeTrackingOverlay),
      width: imageDimensions.w,
      height: imageDimensions.h,
      createdAt: new Date().toISOString(),
      editorItems: items,
      trackingSteps,
      steps: trackingSteps.map((step) => ({
        ...step,
        markers: items
          .filter(
            (item) => item.tool !== "eraser" && item.trackingStepId === step.id,
          )
          .map((item) => {
            const anchor = getTrackingAnchor(item, context);

            return {
              id: `${evidenceId}_${item.id}`,
              xPercent: imageDimensions.w
                ? clamp((anchor.x / imageDimensions.w) * 100, 0, 100)
                : 0,
              yPercent: imageDimensions.h
                ? clamp((anchor.y / imageDimensions.h) * 100, 0, 100)
                : 0,
            };
          }),
      })),
    };
  }, [
    createBaseDataUrl,
    createFinalDataUrl,
    imageDimensions.h,
    imageDimensions.w,
    includeTrackingOverlay,
    items,
    trackingSteps,
  ]);

  const handleSendToTicket = useCallback(async () => {
    try {
      if (!onSendToTicket) return;
      await onSendToTicket(createEvidence());
      setImageError(null);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Falha ao enviar a imagem para o chamado.",
      );
    }
  }, [createEvidence, onSendToTicket]);

  const handleExport = useCallback(() => {
    try {
      const dataUrl = createFinalDataUrl();

      if (onExport) onExport(dataUrl);
      else {
        const link = document.createElement("a");

        link.download = `imagem-editada-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }

      setImageError(null);
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Falha ao exportar a imagem.",
      );
    }
  }, [createFinalDataUrl, onExport]);

  const handleScreenshot = useCallback(() => {
    try {
      const dataUrl = createFinalDataUrl();
      const link = document.createElement("a");

      link.download = `print-editor-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      setImageError(null);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : "Falha ao tirar o print da imagem.",
      );
    }
  }, [createFinalDataUrl]);

  const handleConfirm = useCallback(() => {
    try {
      if (onConfirmDocument) onConfirmDocument(createEvidence());
      else onConfirm?.(createFinalDataUrl());
      setImageError(null);
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : "Falha ao confirmar a imagem.",
      );
    }
  }, [createEvidence, createFinalDataUrl, onConfirm, onConfirmDocument]);

  return { handleSendToTicket, handleExport, handleScreenshot, handleConfirm };
}
