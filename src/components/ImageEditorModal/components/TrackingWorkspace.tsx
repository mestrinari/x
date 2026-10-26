import { Button } from "../ui/Button";

import { PALETTE_COLORS } from "../constants";

import {
  ColorSwatch,
  Overlay,
  PanelLabel,
  TextInput,
  TrackingCreator,
  TrackingStepCard,
  TrackingStepsRail,
  TrackingWorkspaceBar,
  TrackingWorkspaceColumn,
} from "../styles";

import type { ImageEditorController } from "../useImageEditor";

type Props = Pick<
  ImageEditorController,
  | "items"
  | "trackingSteps"
  | "setTrackingSteps"
  | "activeTrackingStepId"
  | "setActiveTrackingStepId"
  | "trackingCode"
  | "setTrackingCode"
  | "trackingName"
  | "setTrackingName"
  | "trackingDescription"
  | "setTrackingDescription"
  | "trackingDraftColor"
  | "setTrackingDraftColor"
  | "trackingError"
  | "includeTrackingOverlay"
  | "setIncludeTrackingOverlay"
  | "applyTrackingColor"
  | "activateTrackingStep"
  | "createTrackingStep"
  | "activeTrackingStep"
>;

export function TrackingWorkspace({
  items,
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
  applyTrackingColor,
  activateTrackingStep,
  createTrackingStep,
  activeTrackingStep,
}: Props) {
  return (
    <TrackingWorkspaceBar>
      <TrackingWorkspaceColumn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <PanelLabel>Passos e tarefas por cor</PanelLabel>
          <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>
            Crie, ative e desenhe
          </span>
        </div>
        <TrackingCreator>
          <TextInput
            value={trackingCode}
            onChange={(event) => setTrackingCode(event.target.value)}
            placeholder="ID: PASSO-01"
            maxLength={32}
          />
          <TextInput
            value={trackingName}
            onChange={(event) => setTrackingName(event.target.value)}
            placeholder="Nome da tarefa"
            maxLength={80}
          />
          <TextInput
            value={trackingDescription}
            onChange={(event) => setTrackingDescription(event.target.value)}
            placeholder="Descrição do overlay"
            maxLength={240}
          />
          <input
            type="color"
            value={trackingDraftColor}
            onChange={(event) => setTrackingDraftColor(event.target.value)}
            aria-label="Cor do novo passo"
            style={{
              width: 38,
              height: 32,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              background: "transparent",
            }}
          />
          <Button variant="primary" size="sm" onClick={createTrackingStep}>
            Criar
          </Button>
        </TrackingCreator>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            flexWrap: "wrap",
          }}
        >
          {PALETTE_COLORS.map((color) => (
            <ColorSwatch
              key={`tracking-top-${color}`}
              $color={color}
              $active={trackingDraftColor === color}
              onClick={() => setTrackingDraftColor(color)}
              title={`Nova tarefa em ${color}`}
              style={{ width: 24, height: 24 }}
            />
          ))}
          {trackingError && (
            <span
              role="alert"
              style={{ color: "var(--destructive)", fontSize: 10 }}
            >
              {trackingError}
            </span>
          )}
        </div>
      </TrackingWorkspaceColumn>

      <TrackingWorkspaceColumn>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <PanelLabel>{trackingSteps.length} agrupamento(s)</PanelLabel>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: "var(--muted-foreground)",
              fontSize: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={includeTrackingOverlay}
              onChange={(event) =>
                setIncludeTrackingOverlay(event.target.checked)
              }
            />
            Overlay na exportação
          </label>
        </div>
        {trackingSteps.length ? (
          <TrackingStepsRail>
            {trackingSteps.map((step, index) => {
              const itemCount = items.filter(
                (item) =>
                  item.trackingStepId === step.id && item.tool !== "eraser",
              ).length;

              return (
                <TrackingStepCard
                  type="button"
                  key={step.id}
                  $active={activeTrackingStepId === step.id}
                  $color={step.color}
                  onClick={() => activateTrackingStep(step)}
                >
                  <strong
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 11,
                    }}
                  >
                    {index + 1}. {step.code} · {step.name}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: "var(--muted-foreground)",
                      fontSize: 10,
                    }}
                  >
                    {itemCount} elemento(s)
                  </span>
                </TrackingStepCard>
              );
            })}
          </TrackingStepsRail>
        ) : (
          <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
            Nenhum passo criado. Os desenhos continuam disponíveis sem vínculo.
          </span>
        )}
        {activeTrackingStep && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(130px, .7fr) minmax(180px, 1fr) 38px auto",
              gap: 7,
              alignItems: "center",
            }}
          >
            <TextInput
              value={activeTrackingStep.name}
              onChange={(event) =>
                setTrackingSteps((previous) =>
                  previous.map((step) =>
                    step.id === activeTrackingStep.id
                      ? { ...step, name: event.target.value }
                      : step,
                  ),
                )
              }
              aria-label="Nome da tarefa ativa"
            />
            <TextInput
              value={activeTrackingStep.description}
              onChange={(event) =>
                setTrackingSteps((previous) =>
                  previous.map((step) =>
                    step.id === activeTrackingStep.id
                      ? { ...step, description: event.target.value }
                      : step,
                  ),
                )
              }
              placeholder="Descrição da tarefa ativa"
              aria-label="Descrição da tarefa ativa"
              maxLength={240}
            />
            <input
              type="color"
              value={activeTrackingStep.color}
              onChange={(event) => applyTrackingColor(event.target.value)}
              aria-label="Cor da tarefa ativa"
              style={{
                width: 38,
                height: 32,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: "transparent",
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTrackingStepId(null)}
            >
              Desativar
            </Button>
          </div>
        )}
      </TrackingWorkspaceColumn>
    </TrackingWorkspaceBar>
  );
}
