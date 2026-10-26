import type { Stroke, RectShape, TextShape } from "./types";
import { toRad, getTextDimensions } from "./geometry";

export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke.width;
  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.strokeStyle = stroke.color;
  }
  ctx.beginPath();
  ctx.moveTo(stroke.points[0]!.x, stroke.points[0]!.y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i]!.x, stroke.points[i]!.y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawRect(
  ctx: CanvasRenderingContext2D,
  rect: RectShape,
  layerImages: Map<string, HTMLImageElement>,
) {
  ctx.save();
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(toRad(rect.rotation));
  if (rect.imageDataUrl) {
    const image = layerImages.get(rect.imageDataUrl);
    if (image?.complete && image.naturalWidth)
      ctx.drawImage(
        image,
        -rect.width / 2,
        -rect.height / 2,
        rect.width,
        rect.height,
      );
    ctx.restore();
    return;
  }
  ctx.lineWidth = rect.strokeWidth;
  ctx.strokeStyle = rect.strokeColor;
  if (rect.fillColor !== "transparent") {
    ctx.globalAlpha = rect.fillOpacity;
    ctx.fillStyle = rect.fillColor;
    ctx.fillRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
    ctx.globalAlpha = 1;
  }
  ctx.strokeRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.restore();
}

export function drawText(ctx: CanvasRenderingContext2D, text: TextShape) {
  ctx.save();
  const dims = getTextDimensions(text, ctx);
  const cx = text.x + dims.w / 2;
  const cy = text.y - dims.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(toRad(text.rotation));
  ctx.font = `${text.fontWeight === "bold" ? "bold" : "normal"} ${text.fontSize}px sans-serif`;
  ctx.fillStyle = text.color;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(text.text, 0, 0);
  ctx.restore();
}
