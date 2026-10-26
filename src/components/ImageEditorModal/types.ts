import type { TicketImageEvidence } from "./ticketImageEvidence";
import type { ReactNode } from "react";

export type Tool =
  | "select"
  | "pen"
  | "rectangle"
  | "text"
  | "crop"
  | "eraser";

export interface DrawPoint {
  x: number;
  y: number;
  color: string;
  width: number;
}

export interface Stroke {
  id: string;
  trackingStepId?: string;
  tool: "pen" | "eraser";
  points: DrawPoint[];
  color: string;
  width: number;
}

export interface RectShape {
  /** Imagem colada reutiliza a geometria de selecao e transformacao. */
  imageDataUrl?: string;
  imageName?: string;
  id: string;
  trackingStepId?: string;
  tool: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  fillOpacity: number;
  rotation: number;
}

export interface TextShape {
  id: string;
  trackingStepId?: string;
  tool: "text";
  x: number;
  y: number;
  text: string;
  color: string;
  fontSize: number;
  fontWeight: "normal" | "bold";
  rotation: number;
}

export type CanvasItem = Stroke | RectShape | TextShape;

export interface TrackingStep {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
}

export interface ImageEditorProps {
  ticketControls?: ReactNode;
  sendToTicketDisabled?: boolean;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close */
  onOpenChange: (open: boolean) => void;
  /** Initial image URL / dataURL to edit */
  initialImage?: string | null;
  /** Existing non-destructive objects restored over the base image. */
  initialItems?: CanvasItem[];
  /** Existing tracking labels restored with the editable objects. */
  initialTrackingSteps?: TrackingStep[];
  /** Called when user clicks "Export" with the final dataURL */
  onExport?: (dataUrl: string) => void;
  /** Called when user clicks "Confirmar" (e.g. for a ticket attachment) */
  onConfirm?: (dataUrl: string) => void;
  /** Returns the base image and its editable vector layer separately. */
  onConfirmDocument?: (evidence: TicketImageEvidence) => void;
  /** Sends the edited image and its tracked steps to the new-ticket flow. */
  onSendToTicket?: (evidence: TicketImageEvidence) => void | Promise<void>;
  /** Contextual label for the action that persists the editor document. */
  sendToTicketLabel?: string;
  /** Hides the standalone PNG download when the editor is bound to an open ticket. */
  hideExport?: boolean;
  /** Element that receives the Radix portal (used by Picture-in-Picture). */
  portalContainer?: HTMLElement | null;
}

/* ════════════════════════════════════════════════
   RESIZE HANDLE TYPES
   ════════════════════════════════════════════════ */

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export interface ResizeState {
  handle: ResizeHandle;
  startMouse: { x: number; y: number };
  startBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface RotateState {
  startMouse: { x: number; y: number };
  startRotation: number;
  centerX: number;
  centerY: number;
}

