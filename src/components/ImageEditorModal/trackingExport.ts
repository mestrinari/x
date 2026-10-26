import type { CanvasItem, TrackingStep } from "./types";
import { clamp, getTextDimensions, getTrackingAnchor, wrapCanvasText } from "./geometry";

export function drawTrackingExportOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  steps: TrackingStep[],
  items: CanvasItem[],
) {
  const trackedSteps = steps
    .map(step => ({
      step,
      items: items.filter(item => item.tool !== "eraser" && item.trackingStepId === step.id),
    }))
    .filter(entry => entry.items.length > 0);

  if (!trackedSteps.length) return;

  const fontSize = clamp(Math.round(width / 85), 11, 20);
  const padding = Math.max(8, fontSize);
  const badgeRadius = Math.max(9, Math.round(fontSize * 0.9));

  trackedSteps.forEach((entry, index) => {
    entry.items.forEach(item => {
      const anchor = getTrackingAnchor(item, ctx);
      const x = clamp(anchor.x, badgeRadius + 2, width - badgeRadius - 2);
      const y = clamp(anchor.y, badgeRadius + 2, height - badgeRadius - 2);

      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = entry.step.color;
      ctx.fill();
      ctx.lineWidth = Math.max(2, fontSize / 7);
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(index + 1), x, y + 0.5);
      ctx.restore();
    });
  });

  const panelWidth = Math.max(
    1,
    Math.min(width - padding * 2, Math.max(240, Math.round(width * 0.4))),
  );
  const lineHeight = Math.round(fontSize * 1.35);
  const contentWidth = Math.max(1, panelWidth - padding * 3 - badgeRadius * 2);
  const rows = trackedSteps.map(entry => {
    ctx.save();
    ctx.font = `${fontSize}px sans-serif`;
    const descriptionLines = entry.step.description
      ? wrapCanvasText(ctx, entry.step.description, contentWidth, 3)
      : [];

    ctx.restore();

    return {
      ...entry,
      descriptionLines,
      height: lineHeight + descriptionLines.length * lineHeight + padding,
    };
  });
  const titleHeight = lineHeight + padding;
  const requestedHeight = titleHeight + rows.reduce((sum, row) => sum + row.height, 0) + padding;
  const panelHeight = Math.min(height - padding * 2, requestedHeight);
  const panelX = width - panelWidth - padding;
  const panelY = padding;

  ctx.save();
  ctx.fillStyle = "rgba(10, 15, 30, 0.86)";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
  ctx.beginPath();
  ctx.rect(panelX, panelY, panelWidth, panelHeight);
  ctx.clip();

  let cursorY = panelY + padding;

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("RASTREAMENTO DA EDIÇÃO", panelX + padding, cursorY);
  cursorY += titleHeight;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (cursorY + lineHeight > panelY + panelHeight - padding) break;
    const markerX = panelX + padding + badgeRadius;
    const markerY = cursorY + badgeRadius;

    ctx.beginPath();
    ctx.arc(markerX, markerY, badgeRadius, 0, Math.PI * 2);
    ctx.fillStyle = row!.step.color;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), markerX, markerY + 0.5);

    const textX = panelX + padding * 2 + badgeRadius * 2;

    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`${row!.step.code} · ${row!.step.name}`, textX, cursorY);
    let descriptionY = cursorY + lineHeight;

    ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
    ctx.font = `${fontSize}px sans-serif`;
    row!.descriptionLines.forEach(line => {
      if (descriptionY + lineHeight <= panelY + panelHeight - padding) {
        ctx.fillText(line, textX, descriptionY);
      }

      descriptionY += lineHeight;
    });
    cursorY += row!.height;
  }

  ctx.restore();
}

