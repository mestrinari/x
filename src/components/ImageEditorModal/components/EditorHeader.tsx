import { Button } from "../ui/Button";
import {
  Scissors,
  Download,
  Upload,
  Send,
  Camera,
  ClipboardPaste,
  MonitorUp,
} from "lucide-react";

import type { ImageEditorProps } from "../types";

import { BottomActions, HeaderBar, HeaderTitle } from "../styles";

import type { ImageEditorController } from "../useImageEditor";

type Props = Pick<
  ImageEditorController,
  | "imageSrc"
  | "isLoadingImage"
  | "capturingScreen"
  | "handleCaptureScreen"
  | "handlePasteFromClipboard"
  | "handleSendToTicket"
  | "handleExport"
  | "handleScreenshot"
  | "handleConfirm"
  | "handleUploadClick"
> &
  Pick<
    ImageEditorProps,
    | "onConfirm"
    | "onConfirmDocument"
    | "onSendToTicket"
    | "sendToTicketLabel"
    | "hideExport"
    | "sendToTicketDisabled"
  >;

export function EditorHeader({
  imageSrc,
  isLoadingImage,
  capturingScreen,
  handleCaptureScreen,
  handlePasteFromClipboard,
  handleSendToTicket,
  handleExport,
  handleScreenshot,
  handleConfirm,
  handleUploadClick,
  onConfirm,
  onConfirmDocument,
  onSendToTicket,
  sendToTicketLabel,
  hideExport,
  sendToTicketDisabled,
}: Props) {
  return (
    <HeaderBar>
      <HeaderTitle>
        <Scissors size={18} />
        Editor de Imagem
      </HeaderTitle>
      <BottomActions>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<MonitorUp size={14} />}
          onClick={handleCaptureScreen}
          disabled={capturingScreen || isLoadingImage}
          title="Capturar tela ou janela. Para recortar pelo Windows, use Win + Shift + S e depois Ctrl + V aqui."
        >
          {capturingScreen ? "Capturando..." : "Capturar tela"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Camera size={14} />}
          onClick={handleScreenshot}
          disabled={!imageSrc || isLoadingImage}
          title="Baixar um print da imagem editada"
        >
          Baixar print
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ClipboardPaste size={14} />}
          onClick={handlePasteFromClipboard}
          title="Colar uma imagem da área de transferência"
        >
          Colar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Upload size={14} />}
          onClick={handleUploadClick}
        >
          Upload
        </Button>
        {!hideExport && (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleExport}
            disabled={!imageSrc || isLoadingImage}
          >
            Exportar
          </Button>
        )}
        {onSendToTicket && (
          <Button
            variant="amber"
            size="sm"
            leftIcon={<Send size={14} />}
            onClick={handleSendToTicket}
            disabled={!imageSrc || isLoadingImage || sendToTicketDisabled}
          >
            {sendToTicketLabel}
          </Button>
        )}
        {(onConfirm || onConfirmDocument) && (
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Scissors size={14} />}
            onClick={handleConfirm}
            disabled={!imageSrc || isLoadingImage}
          >
            Confirmar
          </Button>
        )}
      </BottomActions>
    </HeaderBar>
  );
}
