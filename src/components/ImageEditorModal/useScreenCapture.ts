import { useCallback, useEffect, useRef, useState } from "react";
import type { CanvasItem, TrackingStep } from "./types";

export function useScreenCapture(
  open: boolean,
  loadImage: (src: string, items: CanvasItem[], steps: TrackingStep[]) => void,
  setImageError: (error: string | null) => void,
  targetWindow: Window,
) {
  const [capturingScreen, setCapturingScreen] = useState(false);
  const captureStream = useRef<MediaStream | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    return () => {
      generation.current++;
      captureStream.current?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  const handleCaptureScreen = useCallback(async () => {
    if (capturingScreen) return;
    if (!targetWindow.navigator.mediaDevices?.getDisplayMedia) {
      setImageError(
        "Captura de tela indisponível neste navegador. Use Win + Shift + S e depois Ctrl + V no editor.",
      );
      return;
    }
    const requestGeneration = generation.current;
    setCapturingScreen(true);
    setImageError(null);
    let stream: MediaStream | null = null;
    const video = targetWindow.document.createElement("video");
    try {
      stream = await targetWindow.navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      if (requestGeneration !== generation.current) return;
      captureStream.current = stream;
      video.srcObject = stream;
      video.muted = true;
      await video.play();
      await new Promise<void>((resolve, reject) => {
        const timeout = targetWindow.setTimeout(
          () => reject(new Error("A captura demorou demais. Tente novamente.")),
          10000,
        );
        video.requestVideoFrameCallback(() => {
          targetWindow.clearTimeout(timeout);
          resolve();
        });
      });
      if (!stream.active || requestGeneration !== generation.current) return;
      const canvas = targetWindow.document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      if (!context || !canvas.width || !canvas.height)
        throw new Error("Não foi possível capturar a tela.");
      context.drawImage(video, 0, 0);
      loadImage(canvas.toDataURL("image/png"), [], []);
    } catch (error) {
      if (
        requestGeneration === generation.current &&
        !(error instanceof DOMException && error.name === "NotAllowedError")
      )
        setImageError(
          "Não foi possível capturar a tela. Use Win + Shift + S e depois Ctrl + V no editor.",
        );
    } finally {
      stream?.getTracks().forEach((track) => track.stop());
      captureStream.current = null;
      video.pause();
      video.srcObject = null;
      if (requestGeneration === generation.current) setCapturingScreen(false);
    }
  }, [capturingScreen, loadImage, targetWindow, setImageError]);

  return { capturingScreen, handleCaptureScreen };
}
