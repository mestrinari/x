import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import styled, { css, keyframes } from "styled-components";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "amber"
  | "cyan"
  | "green"
  | "white";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled(Loader2)`
  animation: ${spin} 0.75s linear infinite;
  flex-shrink: 0;
`;

const StyledButton = styled.button<{
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: none;
  font-family: inherit;
  font-weight: 600;
  border-radius: var(--radius);
  cursor: pointer;
  transition: opacity 0.18s, transform 0.18s, box-shadow 0.18s;
  width: ${p => p.$fullWidth ? "100%" : "auto"};
  outline: none;
  position: relative;
  white-space: nowrap;
  text-decoration: none;

  ${p => p.$size === "sm" && css`padding: 0.375rem 0.875rem; font-size: 0.75rem;`}
  ${p => p.$size === "md" && css`padding: 0.625rem 1.25rem; font-size: 0.8125rem;`}
  ${p => p.$size === "lg" && css`padding: 0.875rem 1.75rem; font-size: 0.9375rem;`}

  ${p => p.$variant === "primary" && css`
    background: var(--primary);
    color: var(--primary-foreground);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}
  ${p => p.$variant === "secondary" && css`
    background: var(--secondary);
    color: var(--secondary-foreground);
    border: 1px solid var(--border);
  `}
  ${p => p.$variant === "ghost" && css`
    background: transparent;
    color: var(--muted-foreground);
    border: 1px solid var(--border);
  `}
  ${p => p.$variant === "danger" && css`
    background: var(--destructive-solid);
    color: var(--destructive-foreground);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}
  ${p => p.$variant === "amber" && css`
    background: var(--warning-solid);
    color: var(--warning-foreground);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}
  ${p => p.$variant === "cyan" && css`
    background: var(--info-solid);
    color: var(--info-foreground);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}
  ${p => p.$variant === "green" && css`
    background: var(--success-solid);
    color: var(--success-foreground);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}
  ${p => p.$variant === "white" && css`
    background: var(--card);
    color: var(--card-foreground);
    border: 1px solid var(--border);
    box-shadow: 0 2px 8px var(--shadow-color);
  `}

  &:hover:not(:disabled) {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  &:active:not(:disabled) {
    transform: scale(0.97);
    opacity: 0.95;
  }
  &:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }
`;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...rest
    },
    ref,
  ) => (
    <StyledButton
      ref={ref}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 13 : size === "lg" ? 17 : 14} /> : leftIcon}
      {loading ? (children ?? "Carregando…") : children}
      {!loading && rightIcon}
    </StyledButton>
  ),
);

Button.displayName = "Button";

export const PillButton = styled(StyledButton).attrs({
  $variant: "amber",
  $size: "md",
  $fullWidth: false,
})`
  border-radius: 999px;
  padding: 0.875rem 1.375rem;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.875rem;
`;

export const ButtonGroup = styled.div<{ $gap?: string }>`
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${p => p.$gap || "0.75rem"};
  align-items: center;
`;
