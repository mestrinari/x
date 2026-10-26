import { DialogContent, DialogHeader, DialogTitle } from "./dialog";
import styled from "styled-components";

export const Overlay = styled(DialogContent)`
  input:not([type="checkbox"]):not([type="range"]),
  select,
  textarea {
    border: 1px solid #648ce0;
    border-radius: 5px;
    &:focus-visible {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }
  }
  max-width: none !important;
  width: min(1400px, 96vw);
  height: min(900px, 94vh);
  padding: 0 !important;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--background);
  color: var(--foreground);
  border: 1px solid var(--card-border);
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
  body.qa-devtools-pip-body & {
    width: 100vw;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
    border: 0;
  }
`;

export const HeaderBar = styled(DialogHeader)`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 10px 56px 10px 16px;
  flex-wrap: wrap;
  gap: 8px;
  background: var(--card);
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
`;

export const HeaderTitle = styled(DialogTitle)`
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const TrackingWorkspaceBar = styled.section`
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 14px;
  background: var(--background);
  border-bottom: 1px solid var(--card-border);
  max-height: 40vh;
  overflow-y: auto;
  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    max-height: 260px;
  }
`;

export const TrackingCreator = styled.div`
  display: grid;
  grid-template-columns:
    minmax(100px, 0.5fr) minmax(150px, 0.8fr) minmax(180px, 1fr)
    auto auto;
  gap: 7px;
  align-items: center;
  @media (max-width: 720px) {
    grid-template-columns: 1fr 1fr;
    & > :nth-child(3) {
      grid-column: 1 / -1;
    }
  }
`;

export const TrackingWorkspaceColumn = styled.div`
  width: calc(50% - 6px);
  max-width: 100%;
  min-height: 110px;
  max-height: 35vh;
  resize: both;
  overflow: auto;
  flex: 0 0 auto;
  @media (max-width: 980px) {
    width: 100%;
  }
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 10px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
`;

export const TrackingStepsRail = styled.div`
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding-bottom: 3px;
`;

export const MainArea = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
  position: relative;
`;

export const Toolbar = styled.div`
  width: 56px;
  background: var(--card);
  border-right: 1px solid var(--card-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
  flex-shrink: 0;
  overflow-y: auto;
`;

export const ToolBtn = styled.button<{ $active?: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: ${({ $active }) => ($active ? "var(--primary)" : "transparent")};
  color: ${({ $active }) => ($active ? "var(--primary-foreground)" : "var(--muted-foreground)")};
  transition: all 0.15s ease;
  &:focus-visible,
  &:focus-visible:hover {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
  &:hover {
    background: ${({ $active }) => ($active ? "var(--primary)" : "var(--muted)")};
    color: ${({ $active }) => ($active ? "var(--primary-foreground)" : "var(--foreground)")};
  }
`;

export const Divider = styled.div`
  width: 32px;
  height: 1px;
  background: var(--border);
  margin: 4px 0;
`;

export const CanvasArea = styled.div`
  flex: 0 1 auto;
  width: calc(100% - 336px);
  height: 100%;
  max-width: calc(100% - 56px);
  max-height: 100%;
  resize: both;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--muted) 86%, var(--background));
  position: relative;
  overflow: auto;
  padding: 20px;
  min-width: 0;
  min-height: 0;
`;

export const CanvasWrapper = styled.div`
  position: relative;
  box-shadow: 0 4px 40px var(--shadow-color);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
`;

export const RightPanel = styled.div`
  width: clamp(220px, 22vw, 320px);
  background: var(--background);
  border-left: 1px solid var(--card-border);
  padding: 12px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  @media (max-width: 760px) {
    width: 220px;
    padding: 8px;
  }
`;

export const PanelSection = styled.details`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
  min-width: 0;
  min-height: 44px;
  resize: both;
  overflow: auto;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
  &[data-panel-id] {
    flex: 0 1 auto;
  }
  & > summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 22px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  & > summary::-webkit-details-marker {
    display: none;
  }
  & > summary::before {
    content: "›";
    display: inline-block;
    color: var(--muted-foreground);
    font-size: 18px;
    line-height: 1;
    transform: rotate(0deg);
    transition: transform 0.15s ease;
  }
  &[open] > summary::before {
    transform: rotate(90deg);
  }
`;

export const PanelLabel = styled.span`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--primary);
`;

export const ColorSwatch = styled.button<{ $color: string; $active?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 2px solid
    ${({ $active }) => ($active ? "var(--foreground)" : "var(--border)")};
  background: ${({ $color }) => $color};
  cursor: pointer;
  box-shadow: ${({ $active }) => ($active ? "0 0 0 3px var(--card), 0 0 0 5px var(--primary)" : "none")};
  transition:
    transform 0.1s,
    box-shadow 0.1s;
  &:hover {
    transform: scale(1.1);
  }
  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
`;

export const ColorRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SliderInput = styled.input`
  width: 100%;
  accent-color: var(--primary);
  cursor: pointer;
`;

export const TextareaInput = styled.textarea`
  width: 100%;
  background: var(--input-background);
  color: var(--foreground);
  border: 1px solid var(--input);
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  resize: vertical;
  min-height: 60px;
  font-family: sans-serif;
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

export const TextInput = styled.input`
  width: 100%;
  background: var(--input-background);
  color: var(--foreground);
  border: 1px solid var(--input);
  border-radius: 6px;
  padding: 7px 8px;
  font-size: 12px;
  font-family: sans-serif;
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

export const TrackingStepCard = styled.button<{
  $active: boolean;
  $color: string;
}>`
  min-width: 170px;
  max-width: 240px;
  border: 1px solid
    ${({ $active, $color }) => ($active ? $color : "var(--border)")};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: 7px;
  padding: 8px;
  background: ${({ $active }) => ($active ? "var(--accent)" : "var(--card)")};
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
  &:hover {
    transform: translateY(-1px);
    background: var(--accent);
  }
  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
`;

export const CanvasItemCard = styled.button<{
  $active: boolean;
  $color: string;
}>`
  width: 100%;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 7px;
  align-items: center;
  padding: 7px 8px;
  border: 1px solid
    ${({ $active }) => ($active ? "var(--primary)" : "var(--border)")};
  border-radius: 6px;
  background: ${({ $active }) => ($active ? "var(--accent)" : "var(--card)")};
  color: var(--foreground);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
  &:hover {
    border-color: var(--primary);
    transform: translateX(2px);
  }
  &:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }
  &::before {
    content: "";
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: ${({ $color }) => $color};
  }
`;

export const SelectInput = styled.select`
  width: 100%;
  background: var(--input-background);
  color: var(--foreground);
  border: 1px solid var(--input);
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 13px;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--primary);
  }
`;

export const BottomBar = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(300px, 1fr);
  align-items: center;
  padding: 9px 14px;
  background: var(--card);
  border-top: 1px solid var(--card-border);
  flex-shrink: 0;
  gap: 12px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr auto;
    span[data-role="footer-hint"] {
      display: none;
    }
  }
  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    div[data-role="bottom-actions"] {
      justify-self: start !important;
      flex-wrap: wrap;
    }
  }
`;

export const FooterStatus = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--foreground);
  font-size: 11px;
`;

export const FooterHint = styled.span`
  color: var(--muted-foreground);
  font-size: 10px;
  white-space: nowrap;
`;

export const BottomActions = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const DropZone = styled.div<{ $isOver: boolean }>`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  border: 2px dashed
    ${({ $isOver }) => ($isOver ? "var(--primary)" : "transparent")};
  border-radius: 8px;
  z-index: 10;
  transition:
    border-color 0.2s,
    background 0.2s;
`;

export const DropLabel = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: var(--primary);
  text-align: center;
  line-height: 1.4;
`;

export const ZoomBadge = styled.span`
  font-size: 12px;
  color: var(--muted-foreground);
  padding: 2px 8px;
  background: var(--muted);
  border-radius: 4px;
`;

export const HiddenInput = styled.input`
  display: none;
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  height: 100%;
  color: var(--muted-foreground);
`;
