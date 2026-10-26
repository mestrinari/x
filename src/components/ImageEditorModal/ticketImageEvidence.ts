import { create } from "zustand";
import type { CanvasItem, TrackingStep } from "../ImageEditorModal";

export const TICKET_IMAGE_EVIDENCE_EVENT = "qa:ticket-image-evidence";

export interface TicketImageMarker {
  id: string;
  xPercent: number;
  yPercent: number;
}

export interface TicketImageStep {
  id: string;
  code: string;
  name: string;
  description: string;
  color: string;
  markers: TicketImageMarker[];
}

export interface TicketImageEvidence {
  pending?: boolean;
  imagemId?: number;
  versaoImagem?: string;
  mensagemId?: number | null;
  id: string;
  imageDataUrl: string;
  attachmentDataUrl: string;
  width: number;
  height: number;
  createdAt: string;
  steps: TicketImageStep[];
  /** Camada vetorial editÃ¡vel; nÃ£o Ã© rasterizada na imagem armazenada. */
  editorItems: CanvasItem[];
  trackingSteps: TrackingStep[];
}

interface TicketImageEvidenceState {
  evidences: TicketImageEvidence[];
  addEvidence: (evidence: TicketImageEvidence) => void;
  updateStep: (
    evidenceId: string,
    stepId: string,
    patch: Partial<Pick<TicketImageStep, "code" | "name" | "description" | "color">>,
  ) => void;
  removeEvidence: (evidenceId: string) => void;
  clear: () => void;
}

export const useTicketImageEvidence = create<TicketImageEvidenceState>(set => ({
  evidences: [],
  addEvidence: evidence => set(state => ({
    evidences: [
      ...state.evidences.filter(item => item.id !== evidence.id),
      evidence,
    ],
  })),
  updateStep: (evidenceId, stepId, patch) => set(state => ({
    evidences: state.evidences.map(evidence => evidence.id === evidenceId
      ? {
          ...evidence,
          steps: evidence.steps.map(step => step.id === stepId ? { ...step, ...patch } : step),
        }
      : evidence),
  })),
  removeEvidence: evidenceId => set(state => ({
    evidences: state.evidences.filter(evidence => evidence.id !== evidenceId),
  })),
  clear: () => set({ evidences: [] }),
}));

export function stageTicketImageEvidence(evidence: TicketImageEvidence) {
  useTicketImageEvidence.getState().addEvidence(evidence);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TICKET_IMAGE_EVIDENCE_EVENT, {
      detail: { evidenceId: evidence.id },
    }));
  }
}
