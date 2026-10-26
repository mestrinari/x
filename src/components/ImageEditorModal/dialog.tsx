import React, { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "motion/react";
import styled, { createGlobalStyle } from "styled-components";

/* ════════════════════════════════════════════════
   DARK MODE — global overlay reset
   ════════════════════════════════════════════════ */

export const DialogGlobalStyle = createGlobalStyle`
  /* remove default Radix overlay padding */
  .radix-dialog-overlay {
    margin: 0;
  }
`;

/* ════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════ */

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
  modal?: boolean;
  container?: HTMLElement | null;
}

export interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler;
  $theme?: "dark" | "light";
}

export interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export interface DialogCloseProps {
  children?: React.ReactNode;
  className?: string;
}

/* ════════════════════════════════════════════════
   STYLED COMPONENTS
   ════════════════════════════════════════════════ */

const StyledOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay, rgba(0, 0, 0, 0.68));
  backdrop-filter: blur(4px);
  padding: 16px;
  body.qa-devtools-pip-body & {
    padding: 0;
    background: var(--background);
    backdrop-filter: none;
  }
`;

const StyledContent = styled(motion.div)<{ $theme: "dark" | "light" }>`
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 12px;
  padding: 24px;
  font-family: var(--font-sans, system-ui, sans-serif);
  outline: none;

  background: var(
    --popover,
    ${({ $theme }) => ($theme === "dark" ? "#162238" : "#ffffff")}
  );
  color: var(
    --popover-foreground,
    ${({ $theme }) => ($theme === "dark" ? "#f4f7fb" : "#111827")}
  );
  border: 1px solid
    var(
      --card-border-strong,
      var(
        --border,
        ${({ $theme }) => ($theme === "dark" ? "#35465f" : "#c9d3e1")}
      )
    );
  box-shadow: 0 14px 44px var(--shadow-color, rgba(0, 0, 0, 0.28));

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--switch-background, #8291a6);
    border-radius: 4px;
  }
`;

const StyledHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--card-border, var(--border, #c9d3e1));
`;

const StyledTitle = styled(DialogPrimitive.Title)`
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
`;

const StyledDescription = styled(DialogPrimitive.Description)`
  font-size: 14px;
  line-height: 1.5;
  color: var(--muted-foreground, #526176);
`;

const StyledFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--card-border, var(--border, #c9d3e1));
`;

const StyledClose = styled(DialogPrimitive.Close)`
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: transparent;
  color: var(--muted-foreground, #526176);
  transition: all 0.15s ease;

  &:hover {
    background: var(--muted, #e9eef5);
    color: var(--foreground, #111827);
  }

  &::before {
    content: "\\2715";
    font-size: 16px;
    font-weight: 400;
  }
`;

/* ════════════════════════════════════════════════
   COMPONENTS
   ════════════════════════════════════════════════ */

/** Root Dialog wrapper (Radix Portal + Overlay + animation) */
export const Dialog = React.forwardRef<HTMLButtonElement, DialogProps>(
  (
    {
      children,
      open,
      onOpenChange,
      defaultOpen,
      modal = true,
      container,
      ...props
    },
    ref,
  ) => (
    <DialogPrimitive.Root
      {...(open !== undefined ? { open } : {})}
      {...(onOpenChange !== undefined ? { onOpenChange } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      modal={modal}
    >
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount container={container}>
            <StyledOverlay
              as={modal ? DialogPrimitive.Overlay : "div"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => onOpenChange?.(false)}
            >
              {children}
            </StyledOverlay>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  ),
);

Dialog.displayName = "Dialog";

/** Dialog content with entrance animation */
export const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, className, onKeyDown, $theme = "dark", ...props }, ref) => (
    <StyledContent
      ref={ref}
      as={DialogPrimitive.Content}
      $theme={$theme}
      className={className}
      onKeyDown={onKeyDown}
      initial={{ opacity: 0, scale: 0.95, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 12 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onInteractOutside={(e) => e.preventDefault()}
      onEscapeKeyDown={() => {}}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
      <StyledClose aria-label="Fechar" />
    </StyledContent>
  ),
);

DialogContent.displayName = "DialogContent";

/** Header section inside dialog */
export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <StyledHeader ref={ref} className={className} {...props}>
      {children}
    </StyledHeader>
  ),
);

DialogHeader.displayName = "DialogHeader";

/** Title */
export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => (
    <StyledTitle ref={ref} className={className} asChild={false} {...props}>
      {children}
    </StyledTitle>
  ),
);

DialogTitle.displayName = "DialogTitle";

/** Description / subtitle */
export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ children, className, ...props }, ref) => (
  <StyledDescription ref={ref} className={className} {...props}>
    {children}
  </StyledDescription>
));

DialogDescription.displayName = "DialogDescription";

/** Footer actions row */
export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, ...props }, ref) => (
    <StyledFooter ref={ref} className={className} {...props}>
      {children}
    </StyledFooter>
  ),
);

DialogFooter.displayName = "DialogFooter";

/** Close trigger button */
export const DialogClose = forwardRef<HTMLButtonElement, DialogCloseProps>(
  ({ children, className, ...props }, ref) => (
    <StyledClose ref={ref} className={className} {...props}>
      {children ?? undefined}
    </StyledClose>
  ),
);

DialogClose.displayName = "DialogClose";
