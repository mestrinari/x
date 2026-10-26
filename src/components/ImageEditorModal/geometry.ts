import type { CanvasItem, DrawPoint, RectShape, ResizeHandle, Stroke, TextShape } from "./types";
import { HANDLE_HIT, ROTATE_HANDLE_OFFSET } from "./constants";

let _id = 0;
export const uid = () => `item_${++_id}_${Date.now()}`;

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function pointInTransformedRect(
  px: number,
  py: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  rotation: number,
  tolerance = 4
): boolean {
  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const rad = toRad(-rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const lx = (px - cx) * cos - (py - cy) * sin + cx;
  const ly = (px - cx) * sin + (py - cy) * cos + cy;
  return (
    lx >= rx - tolerance &&
    lx <= rx + rw + tolerance &&
    ly >= ry - tolerance &&
    ly <= ry + rh + tolerance
  );
}

export function pointInStroke(
  px: number,
  py: number,
  stroke: Stroke,
  tolerance = 8
): boolean {
  for (const p of stroke.points) {
    if (Math.abs(px - p.x) <= tolerance && Math.abs(py - p.y) <= tolerance)
      return true;
  }
  return false;
}

export function pointInText(
  px: number,
  py: number,
  text: TextShape,
  ctx: CanvasRenderingContext2D,
  tolerance = 4
): boolean {
  ctx.save();
  ctx.font = `${text.fontWeight === "bold" ? "bold" : "normal"} ${text.fontSize}px sans-serif`;
  const metrics = ctx.measureText(text.text);
  const tw = metrics.width;
  const th = text.fontSize;
  ctx.restore();
  return pointInTransformedRect(px, py, text.x, text.y - th, tw, th, text.rotation, tolerance);
}

export function getTextDimensions(
  text: TextShape,
  ctx: CanvasRenderingContext2D
): { w: number; h: number } {
  ctx.save();
  ctx.font = `${text.fontWeight === "bold" ? "bold" : "normal"} ${text.fontSize}px sans-serif`;
  const metrics = ctx.measureText(text.text);
  ctx.restore();
  return { w: metrics.width, h: text.fontSize };
}

export function getSelectableBounds(
  item: RectShape | TextShape,
  ctx: CanvasRenderingContext2D
) {
  if (item.tool === "rectangle") {
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
      rotation: item.rotation,
    };
  }

  const dimensions = getTextDimensions(item, ctx);
  return {
    x: item.x,
    y: item.y - dimensions.h,
    width: dimensions.w,
    height: dimensions.h,
    rotation: item.rotation,
  };
}

export function hitTestResizeHandle(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  tolerance = HANDLE_HIT
): ResizeHandle | null {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cos = Math.cos(toRad(rotation));
  const sin = Math.sin(toRad(rotation));

  const handles: { key: ResizeHandle; localX: number; localY: number }[] = [
    { key: "nw", localX: x, localY: y },
    { key: "n", localX: x + w / 2, localY: y },
    { key: "ne", localX: x + w, localY: y },
    { key: "e", localX: x + w, localY: y + h / 2 },
    { key: "se", localX: x + w, localY: y + h },
    { key: "s", localX: x + w / 2, localY: y + h },
    { key: "sw", localX: x, localY: y + h },
    { key: "w", localX: x, localY: y + h / 2 },
  ];

  for (const handle of handles) {
    const hx = (handle.localX - cx) * cos - (handle.localY - cy) * sin + cx;
    const hy = (handle.localX - cx) * sin + (handle.localY - cy) * cos + cy;
    if (Math.abs(px - hx) <= tolerance && Math.abs(py - hy) <= tolerance) {
      return handle.key;
    }
  }
  return null;
}

export function hitTestRotateHandle(
  px: number,
  py: number,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  tolerance = 10
): boolean {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const cos = Math.cos(toRad(rotation));
  const sin = Math.sin(toRad(rotation));
  const handleLocalX = cx;
  const handleLocalY = y - ROTATE_HANDLE_OFFSET;
  const hx = (handleLocalX - cx) * cos - (handleLocalY - cy) * sin + cx;
  const hy = (handleLocalX - cx) * sin + (handleLocalY - cy) * cos + cy;
  return (
    Math.abs(px - hx) <= tolerance && Math.abs(py - hy) <= tolerance
  );
}

export function applyResize(
  bounds: { x: number; y: number; width: number; height: number },
  handle: ResizeHandle,
  dx: number,
  dy: number,
  rotation: number
): { x: number; y: number; width: number; height: number } {
  const rad = toRad(-rotation);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const localDx = dx * cos - dy * sin;
  const localDy = dx * sin + dy * cos;

  let { x, y, width, height } = bounds;

  switch (handle) {
    case "nw":
      x += localDx; y += localDy; width -= localDx; height -= localDy; break;
    case "n":
      y += localDy; height -= localDy; break;
    case "ne":
      width += localDx; y += localDy; height -= localDy; break;
    case "e":
      width += localDx; break;
    case "se":
      width += localDx; height += localDy; break;
    case "s":
      height += localDy; break;
    case "sw":
      x += localDx; width -= localDx; height += localDy; break;
    case "w":
      x += localDx; width -= localDx; break;
  }

  if (width < 5) {
    if (handle === "nw" || handle === "sw" || handle === "w") x += width - 5;
    width = 5;
  }
  if (height < 5) {
    if (handle === "nw" || handle === "n" || handle === "ne") y += height - 5;
    height = 5;
  }

  return { x, y, width, height };
}

export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
  maxLines = 3,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    let last = lines[maxLines - 1];
    while (last!.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last!.slice(0, -1);
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

export function getTrackingAnchor(item: CanvasItem, ctx: CanvasRenderingContext2D) {
  if (item.tool === "rectangle") return { x: item.x, y: item.y };
  if (item.tool === "text") {
    const dimensions = getTextDimensions(item, ctx);
    return { x: item.x, y: item.y - dimensions.h };
  }
  const points = item.points;
  return {
    x: Math.min(...points.map(point => point.x)),
    y: Math.min(...points.map(point => point.y)),
  };
}

export function applyTrackingColorToItem(item: CanvasItem, color: string): CanvasItem {
  if (item.tool === "eraser") return item;
  if (item.tool === "pen") {
    return {
      ...item,
      color,
      points: item.points.map(point => ({ ...point, color })),
    };
  }
  if (item.tool === "rectangle") {
    return {
      ...item,
      strokeColor: color,
      fillColor: item.fillColor === "transparent" ? "transparent" : color,
    };
  }
  return { ...item, color };
}

export function getCanvasItemLabel(item: CanvasItem, index: number) {
  if (item.tool === "rectangle" && item.imageDataUrl) return item.imageName || `Imagem ${index + 1}`;
  if (item.tool === "pen") return `Traço ${index + 1}`;
  if (item.tool === "eraser") return `Borracha ${index + 1}`;
  if (item.tool === "rectangle") return `Retângulo ${index + 1}`;
  if (item.tool === "text") return item.text.trim() || `Texto ${index + 1}`;
  return `Item ${index + 1}`;
}

export function getCanvasItemColor(item: CanvasItem) {
  if (item.tool === "rectangle") return item.strokeColor;
  if (item.tool === "eraser") return "#64748b";
  return item.color;
}

