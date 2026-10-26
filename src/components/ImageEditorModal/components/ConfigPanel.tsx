import type { HTMLAttributes, ReactNode } from "react";
import { PanelLabel, PanelSection } from "../styles";

export type ConfigPanelId =
  | "canvas"
  | "items"
  | "color"
  | "link"
  | "stroke"
  | "rectangle"
  | "text"
  | "rotation"
  | "crop"
  | "zoom";

export interface ConfigPanelProps {
  id: ConfigPanelId;
  title: ReactNode;
  count?: ReactNode;
  children: ReactNode;
  panelProps: (id: ConfigPanelId) => HTMLAttributes<HTMLDetailsElement>;
}

export function ConfigPanel({
  id,
  title,
  count,
  children,
  panelProps,
}: ConfigPanelProps) {
  return (
    <PanelSection {...panelProps(id)}>
      <summary>
        <PanelLabel>{title}</PanelLabel>
        {count !== undefined && (
          <span style={{ marginLeft: "auto", color: "var(--muted-foreground)", fontSize: 10 }}>
            {count}
          </span>
        )}
      </summary>
      {children}
    </PanelSection>
  );
}
