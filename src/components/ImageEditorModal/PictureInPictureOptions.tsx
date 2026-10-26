import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { StyleSheetManager } from "styled-components";

type PictureInPictureOptions = {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
};

type DocumentPictureInPictureApi = {
  requestWindow: (options?: PictureInPictureOptions) => Promise<Window>;
  window: Window | null;
};

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureApi;
  }
}

export type FloatingWindowHandle = {
  open: () => void;
  close: () => void;
};

type FloatingWindowProps = {
  windowId?: string;
  title: string;
  children: (close: () => void, targetDocument: Document) => ReactNode;
  renderTrigger?: (
    open: () => void,
    state: { isOpen: boolean; isOpening: boolean; isSupported: boolean },
  ) => ReactNode;
  width?: number;
  height?: number;
  dark?: boolean;
  colorTheme?: string;
  onClose?: () => void;
};

const externalWindows = new Map<string, Window>();
const openingWindowIds = new Set<string>();
let nativePictureInPictureOpening = false;

function getOpenExternalWindow(windowId: string) {
  const existing = externalWindows.get(windowId);
  if (existing?.closed) {
    externalWindows.delete(windowId);
    return null;
  }
  return existing ?? null;
}

function openPopupWindow(windowId: string, width: number, height: number) {
  const safeName = `qa_devtools_${windowId.replace(/[^a-z0-9_-]/gi, "_")}`;
  return window.open(
    "",
    safeName,
    `popup=yes,width=${Math.round(width)},height=${Math.round(height)},resizable=yes,scrollbars=no`,
  );
}

function installDevToolsStyles(targetWindow: Window) {
  const host = document.getElementById("qa-devtools-package-root");
  const shadowStyles = host?.shadowRoot?.querySelectorAll("style");

  shadowStyles?.forEach((source) => {
    const style = targetWindow.document.createElement("style");
    style.textContent = source.textContent;
    targetWindow.document.head.appendChild(style);
  });

  for (const styleSheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(styleSheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = targetWindow.document.createElement("style");
      style.textContent = css;
      targetWindow.document.head.appendChild(style);
    } catch {
      if (!styleSheet.href) continue;
      const link = targetWindow.document.createElement("link");
      link.rel = "stylesheet";
      link.href = styleSheet.href;
      targetWindow.document.head.appendChild(link);
    }
  }
}

export const FloatingWindow = forwardRef<
  FloatingWindowHandle,
  FloatingWindowProps
>(function FloatingWindow(
  {
    windowId: configuredWindowId,
    title,
    children,
    renderTrigger,
    width = 1080,
    height = 760,
    dark,
    colorTheme,
    onClose,
  },
  ref,
) {
  const [target, setTarget] = useState<Window | null>(null);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const current = useRef<Window | null>(null);
  const active = useRef(false);
  const generation = useRef(0);
  const mounted = useRef(true);
  const closeCallback = useRef(onClose);
  closeCallback.current = onClose;
  const windowId = configuredWindowId ?? title;
  const isSupported = Boolean(window.documentPictureInPicture);

  const close = useCallback(() => {
    const wasActive = active.current;
    active.current = false;
    generation.current++;
    const previous = current.current;
    current.current = null;
    if (externalWindows.get(windowId) === previous)
      externalWindows.delete(windowId);
    if (previous && !previous.closed) previous.close();
    if (mounted.current) {
      setTarget(null);
      setFallbackOpen(false);
      setIsOpening(false);
      if (wasActive) closeCallback.current?.();
    }
  }, [windowId]);

  const open = useCallback(() => {
    if (active.current) {
      current.current?.focus();
      return;
    }
    if (openingWindowIds.has(windowId)) return;
    const registered = getOpenExternalWindow(windowId);
    if (registered) {
      registered.focus();
      return;
    }
    active.current = true;
    const requestGeneration = ++generation.current;
    setIsOpening(true);
    openingWindowIds.add(windowId);
    const themeSource =
      document.activeElement?.closest<HTMLElement>(
        "[data-color-theme], .dark",
      ) ?? document.body;
    const api = window.documentPictureInPicture;
    const nativeAvailable = Boolean(
      api && !api.window && !nativePictureInPictureOpening,
    );
    // Keep the request in the click handler: Document PiP needs user activation.
    let request: Promise<Window | null>;
    try {
      if (nativeAvailable) {
        nativePictureInPictureOpening = true;
        request = api!.requestWindow({
          width,
          height,
          disallowReturnToOpener: false,
          preferInitialWindowPlacement: false,
        });
      } else
        request = Promise.resolve(openPopupWindow(windowId, width, height));
    } catch (error) {
      request = Promise.reject(error);
    }

    void request
      .then((pip) => {
        if (!mounted.current || requestGeneration !== generation.current) {
          pip?.close();
          return;
        }
        if (!pip) {
          setFallbackOpen(true);
          return;
        }
        current.current = pip;
        pip.document.title = title;
        installDevToolsStyles(pip);
        pip.document.documentElement.className =
          document.documentElement.className;
        pip.document.body.className = document.body.className;
        pip.document.body.classList.add("qa-devtools-pip-body");
        const computed = window.getComputedStyle(themeSource);
        for (let i = 0; i < computed.length; i++) {
          const property = computed.item(i);
          if (property.startsWith("--"))
            pip.document.body.style.setProperty(
              property,
              computed.getPropertyValue(property),
            );
        }
        Object.assign(pip.document.body.style, {
          margin: "0",
          width: "100vw",
          height: "100vh",
          overflow: "hidden",
        });
        pip.addEventListener(
          "pagehide",
          () => {
            if (current.current !== pip) return;
            current.current = null;
            close();
            if (externalWindows.get(windowId) === pip)
              externalWindows.delete(windowId);
          },
          { once: true },
        );
        externalWindows.set(windowId, pip);
        setTarget(pip);
      })
      .catch(() => {
        if (mounted.current && requestGeneration === generation.current) {
          current.current?.close();
          current.current = null;
          setFallbackOpen(true);
        }
      })
      .finally(() => {
        openingWindowIds.delete(windowId);
        if (nativeAvailable) nativePictureInPictureOpening = false;
        if (mounted.current && requestGeneration === generation.current)
          setIsOpening(false);
      });
  }, [close, height, title, width, windowId]);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      close();
    };
  }, [close]);
  useEffect(() => {
    if (!target) return;
    if (dark !== undefined)
      target.document.documentElement.classList.toggle("dark", dark);
    if (colorTheme !== undefined)
      target.document.documentElement.dataset["colorTheme"] = colorTheme;
  }, [target, dark, colorTheme]);

  const targetDocument = target?.document ?? document;
  const content = (
    <StyleSheetManager target={targetDocument.head}>
      <div
        data-color-theme={colorTheme}
        className={`qa-devtools-pip-root${dark ? " dark" : ""}`}
        style={{ width: "100%", height: "100%" }}
      >
        {children(close, targetDocument)}
      </div>
    </StyleSheetManager>
  );
  return (
    <>
      {renderTrigger?.(open, {
        isOpen: Boolean(target) || fallbackOpen,
        isOpening,
        isSupported,
      })}
      {target && createPortal(content, target.document.body)}
      {fallbackOpen && content}
    </>
  );
});
