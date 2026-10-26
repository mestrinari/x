import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  FloatingWindow,
  type FloatingWindowHandle,
} from "./PictureInPictureOptions";
import { ImageEditorModal } from "./ImageEditorModal";
import type { ImageEditorProps } from "./types";

/** Call setOpen(true) directly from the user action, before any asynchronous work. */
export function useFloatingImageEditor() {
  const windowRef = useRef<FloatingWindowHandle>(null);
  const [open, setState] = useState(false);
  const setOpen = useCallback((value: boolean) => {
    if (value) windowRef.current?.open();
    else windowRef.current?.close();
    setState(value);
  }, []);
  return { windowRef, open, setOpen };
}

type Props = ImageEditorProps & {
  windowRef: RefObject<FloatingWindowHandle | null>;
};

export function FloatingImageEditor({ windowRef, ...props }: Props) {
  const id = useId();
  useEffect(() => {
    if (!props.open) windowRef.current?.close();
  }, [props.open, windowRef]);
  return (
    <FloatingWindow
      ref={windowRef}
      windowId={`image-editor-${id}`}
      title="Editor de imagem"
      width={1440}
      height={960}
      onClose={() => props.onOpenChange(false)}
    >
      {(_, targetDocument) => (
        <ImageEditorModal {...props} portalContainer={targetDocument.body} />
      )}
    </FloatingWindow>
  );
}
