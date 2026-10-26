import { useId, useState } from "react";
import type { CanvasItem } from "../ImageEditorModal";
import type { TicketImageStep } from "./ticketImageEvidence";

export function TicketImageMarkerPreview({
  evidenceId,
  src,
  alt,
  steps,
  editorItems = [],
  width,
  height,
  onImageClick,
  onStepClick,
}: {
  evidenceId: string;
  src: string;
  alt: string;
  steps: TicketImageStep[];
  editorItems?: CanvasItem[];
  width?: number | null;
  height?: number | null;
  onImageClick?: () => void;
  onStepClick?: (step: TicketImageStep) => void;
}) {
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const instanceId = useId();
  const maskId = `editor-mask-${instanceId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const hoveredStep = steps.find(step => step.id === hoveredMarker);

  return <div className="relative overflow-visible rounded border border-border bg-black/40" style={{ isolation: 'isolate', zIndex: hoveredStep ? 20 : 0 }}>
    <img
      src={src}
      alt={alt}
      className={onImageClick ? "block h-auto w-full cursor-zoom-in rounded" : "block h-auto w-full rounded"}
      onClick={onImageClick}
    />
    {width && height && editorItems.length > 0 && <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <mask id={maskId}>
          <rect width={width} height={height} fill="white" />
          {editorItems.map(item => item.tool === "eraser" ? <polyline key={item.id} points={item.points.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke="black" strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" /> : null)}
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        {editorItems.map(item => {
          const step = steps.find(step => step.id === item.trackingStepId);
          const interaction = step ? {
            style: { pointerEvents: 'all' as const, cursor: onStepClick ? 'pointer' : 'help' },
            onClick: () => onStepClick?.(step),
            onMouseEnter: () => setHoveredMarker(step.id),
            onMouseLeave: () => setHoveredMarker(null),
          } : {};
          if (item.tool === "pen") return <polyline {...interaction} key={item.id} points={item.points.map(point => `${point.x},${point.y}`).join(" ")} fill="none" stroke={item.color} strokeWidth={item.width} strokeLinecap="round" strokeLinejoin="round" />;
          if (item.tool === "rectangle" && item.imageDataUrl) return <image {...interaction} key={item.id} href={item.imageDataUrl} x={item.x} y={item.y} width={item.width} height={item.height} preserveAspectRatio="none" transform={`rotate(${item.rotation} ${item.x + item.width / 2} ${item.y + item.height / 2})`} />;
          if (item.tool === "rectangle") return <rect {...interaction} key={item.id} x={item.x} y={item.y} width={item.width} height={item.height} fill={item.fillColor} fillOpacity={item.fillOpacity} stroke={item.strokeColor} strokeWidth={item.strokeWidth} transform={`rotate(${item.rotation} ${item.x + item.width / 2} ${item.y + item.height / 2})`} />;
          if (item.tool === "text") return <text {...interaction} key={item.id} x={item.x} y={item.y} fill={item.color} fontSize={item.fontSize} fontWeight={item.fontWeight} transform={`rotate(${item.rotation} ${item.x} ${item.y})`}>{item.text}</text>;
          return null;
        })}
      </g>
    </svg>}
    {steps.flatMap((step, stepIndex) =>
      step.markers.map(marker => {
        const hoverId = step.id;
        return <button
          type="button"
          key={marker.id}
          aria-label={`${step.code}: ${step.name}`}
          aria-describedby={hoveredStep?.id === step.id ? `${maskId}-tooltip` : undefined}
          onClick={() => { setHoveredMarker(current => current === hoverId ? null : hoverId); onStepClick?.(step); }}
          onKeyDown={event => { if (event.key === 'Escape') setHoveredMarker(null); }}
          onMouseEnter={() => setHoveredMarker(hoverId)}
          onMouseLeave={() => setHoveredMarker(null)}
          onFocus={() => setHoveredMarker(hoverId)}
          onBlur={() => setHoveredMarker(null)}
          className="absolute z-10 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-lg transition-transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
          style={{ left: `${marker.xPercent}%`, top: `${marker.yPercent}%`, background: step.color }}
        >
          {stepIndex + 1}
        </button>;
      }),
    )}
    {hoveredStep && <div id={`${maskId}-tooltip`} role="tooltip"
      className="pointer-events-none absolute left-2 right-2 z-20 rounded-lg border border-white/20 bg-slate-950 p-3 text-left text-xs text-white shadow-xl"
      style={{ bottom: 8, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
      <strong className="block" style={{ borderLeft: `3px solid ${hoveredStep.color}`, paddingLeft: 8 }}>
        {hoveredStep.code} · {hoveredStep.name || 'Item sem nome'}
      </strong>
      <span className="mt-1 block text-slate-200">{hoveredStep.description || 'Sem descrição.'}</span>
    </div>}
  </div>;
}

