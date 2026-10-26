import type { ImageEditorProps } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { Dialog } from "./dialog";
import { Button } from "./ui/Button";
import { Upload } from "lucide-react";

import { MIN_CROP_DIM } from "./constants";

import {
  CanvasArea,
  CanvasWrapper,
  DropLabel,
  EmptyState,
  HiddenInput,
  MainArea,
  Overlay,
} from "./styles";

import { EditorHeader } from "./components/EditorHeader";
import { TrackingWorkspace } from "./components/TrackingWorkspace";
import { EditorToolbar } from "./components/EditorToolbar";
import { EditorProperties } from "./components/EditorProperties";
import { EditorFooter } from "./components/EditorFooter";
import { useImageEditor } from "./useImageEditor";
export function ImageEditorModal(props: ImageEditorProps) {
  const {
    open,
    onOpenChange,
    initialImage,
    initialItems,
    initialTrackingSteps,
    onExport,
    onConfirm,
    onConfirmDocument,
    onSendToTicket,
    sendToTicketLabel = "Enviar para chamado",
    hideExport = false,
    portalContainer,
  } = props;
  const {
    imageSrc,
    imageDimensions,
    tool,
    setTool,
    currentColor,
    strokeWidth,
    setStrokeWidth,
    fontSize,
    setFontSize,
    fontWeight,
    setFontWeight,
    rectFillColor,
    setRectFillColor,
    rectStrokeColor,
    setRectStrokeColor,
    rectFillOpacity,
    setRectFillOpacity,
    items,
    history,
    historyIndex,
    selectedId,
    setSelectedId,
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
    isDragging,
    cropArea,
    setCropArea,
    textInput,
    setTextInput,
    isDragOver,
    zoom,
    setZoom,
    imageError,
    isLoadingImage,
    canvasRef,
    canvasAreaRef,
    wrapperRef,
    fileInputRef,
    panelProps,
    applyTrackingColor,
    activateTrackingStep,
    createTrackingStep,
    pushHistory,
    undo,
    redo,
    fitImageToArea,
    capturingScreen,
    handleCaptureScreen,
    handlePasteFromClipboard,
    handleKeyDown,
    handleMouseDown,
    handleMouseMove,
    handlePointerUp,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSendToTicket,
    handleExport,
    handleScreenshot,
    handleConfirm,
    applyCrop,
    canvasWidth,
    setCanvasWidth,
    canvasHeight,
    setCanvasHeight,
    resizeCanvas,
    resetRotation,
    clearAll,
    handleUploadClick,
    handleUploadChange,
    selectedItem,
    activeTrackingStep,
    assignSelectedItemToTrackingStep,
    handleRotationChange,
    commitRotationChange,
  } = useImageEditor(props);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      container={portalContainer ?? null}
      modal={false}
    >
      <Overlay onKeyDown={handleKeyDown}>
        {/* ── Header ── */}
        <EditorHeader
          imageSrc={imageSrc}
          isLoadingImage={isLoadingImage}
          capturingScreen={capturingScreen}
          handleCaptureScreen={handleCaptureScreen}
          handlePasteFromClipboard={handlePasteFromClipboard}
          handleSendToTicket={handleSendToTicket}
          handleExport={handleExport}
          handleScreenshot={handleScreenshot}
          handleConfirm={handleConfirm}
          handleUploadClick={handleUploadClick}
          sendToTicketDisabled={props.sendToTicketDisabled ?? false}
          {...(onConfirm !== undefined ? { onConfirm } : {})}
          {...(onConfirmDocument !== undefined ? { onConfirmDocument } : {})}
          {...(onSendToTicket !== undefined ? { onSendToTicket } : {})}
          {...(sendToTicketLabel !== undefined ? { sendToTicketLabel } : {})}
          {...(hideExport !== undefined ? { hideExport } : {})}
        />

        {props.ticketControls}

        {imageError && (
          <div
            role="alert"
            style={{
              padding: "8px 16px",
              background: "var(--destructive-solid)",
              color: "#fff",
              fontSize: 12,
            }}
          >
            {imageError}
          </div>
        )}

        <TrackingWorkspace
          items={items}
          trackingSteps={trackingSteps}
          setTrackingSteps={setTrackingSteps}
          activeTrackingStepId={activeTrackingStepId}
          setActiveTrackingStepId={setActiveTrackingStepId}
          trackingCode={trackingCode}
          setTrackingCode={setTrackingCode}
          trackingName={trackingName}
          setTrackingName={setTrackingName}
          trackingDescription={trackingDescription}
          setTrackingDescription={setTrackingDescription}
          trackingDraftColor={trackingDraftColor}
          setTrackingDraftColor={setTrackingDraftColor}
          trackingError={trackingError}
          includeTrackingOverlay={includeTrackingOverlay}
          setIncludeTrackingOverlay={setIncludeTrackingOverlay}
          applyTrackingColor={applyTrackingColor}
          activateTrackingStep={activateTrackingStep}
          createTrackingStep={createTrackingStep}
          activeTrackingStep={activeTrackingStep}
        />

        <MainArea>
          {/* ── Left Toolbar ── */}
          <EditorToolbar
            imageSrc={imageSrc}
            tool={tool}
            setTool={setTool}
            items={items}
            history={history}
            historyIndex={historyIndex}
            zoom={zoom}
            setZoom={setZoom}
            isLoadingImage={isLoadingImage}
            undo={undo}
            redo={redo}
            fitImageToArea={fitImageToArea}
            clearAll={clearAll}
            handleUploadClick={handleUploadClick}
          />

          {/* ── Canvas Area ── */}
          <CanvasArea
            ref={canvasAreaRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <AnimatePresence>
              {isDragOver && (
                <motion.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      "color-mix(in srgb, var(--primary) 10%, transparent)",
                    border: `2px dashed ${isDragOver ? "var(--primary)" : "transparent"}`,
                    borderRadius: 8,
                    zIndex: 10,
                  }}
                >
                  <DropLabel>Solte a imagem aqui</DropLabel>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingImage ? (
              <EmptyState>
                <span style={{ fontSize: 15 }}>Carregando imagem...</span>
              </EmptyState>
            ) : !imageSrc ? (
              <EmptyState>
                <Upload size={48} color="currentColor" />
                <span style={{ fontSize: 15 }}>
                  Cole (Ctrl+V), arraste ou faça upload de uma imagem
                </span>
                <Button variant="danger" size="sm" onClick={handleUploadClick}>
                  Escolher Imagem
                </Button>
              </EmptyState>
            ) : (
              <CanvasWrapper
                ref={wrapperRef}
                style={{
                  width: imageDimensions.w * zoom,
                  height: imageDimensions.h * zoom,
                }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleMouseDown}
                  onPointerMove={handleMouseMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{
                    cursor:
                      tool === "select"
                        ? isDragging
                          ? "grabbing"
                          : "default"
                        : "crosshair",
                    display: "block",
                    touchAction: "none",
                  }}
                />

                {/* Crop overlay */}
                {tool === "crop" &&
                  cropArea &&
                  cropArea.w > 2 &&
                  cropArea.h > 2 && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: imageDimensions.w * zoom,
                        height: imageDimensions.h * zoom,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "rgba(0,0,0,0.55)",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: cropArea.x * zoom,
                          top: cropArea.y * zoom,
                          width: cropArea.w * zoom,
                          height: cropArea.h * zoom,
                          background: "transparent",
                          border: "2px dashed var(--primary)",
                        }}
                      />
                    </div>
                  )}

                {/* Crop action buttons */}
                {tool === "crop" &&
                  cropArea &&
                  cropArea.w > MIN_CROP_DIM &&
                  cropArea.h > MIN_CROP_DIM && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: "50%",
                        transform: "translateX(-50%)",
                        display: "flex",
                        gap: 8,
                        zIndex: 20,
                      }}
                    >
                      <Button variant="danger" size="sm" onClick={applyCrop}>
                        Aplicar Crop
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCropArea(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
              </CanvasWrapper>
            )}
          </CanvasArea>

          {/* ── Right Panel ── */}
          <EditorProperties
            tool={tool}
            setTool={setTool}
            currentColor={currentColor}
            strokeWidth={strokeWidth}
            setStrokeWidth={setStrokeWidth}
            fontSize={fontSize}
            setFontSize={setFontSize}
            fontWeight={fontWeight}
            setFontWeight={setFontWeight}
            rectFillColor={rectFillColor}
            setRectFillColor={setRectFillColor}
            rectStrokeColor={rectStrokeColor}
            setRectStrokeColor={setRectStrokeColor}
            rectFillOpacity={rectFillOpacity}
            setRectFillOpacity={setRectFillOpacity}
            items={items}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            trackingSteps={trackingSteps}
            cropArea={cropArea}
            textInput={textInput}
            setTextInput={setTextInput}
            zoom={zoom}
            setZoom={setZoom}
            isLoadingImage={isLoadingImage}
            panelProps={panelProps}
            applyTrackingColor={applyTrackingColor}
            pushHistory={pushHistory}
            canvasWidth={canvasWidth}
            setCanvasWidth={setCanvasWidth}
            canvasHeight={canvasHeight}
            setCanvasHeight={setCanvasHeight}
            resizeCanvas={resizeCanvas}
            resetRotation={resetRotation}
            selectedItem={selectedItem}
            activeTrackingStep={activeTrackingStep}
            assignSelectedItemToTrackingStep={assignSelectedItemToTrackingStep}
            handleRotationChange={handleRotationChange}
            commitRotationChange={commitRotationChange}
          />
        </MainArea>

        {/* ── Bottom Bar ── */}
        <EditorFooter
          imageSrc={imageSrc}
          imageDimensions={imageDimensions}
          items={items}
          history={history}
          historyIndex={historyIndex}
          includeTrackingOverlay={includeTrackingOverlay}
          zoom={zoom}
          setZoom={setZoom}
          isLoadingImage={isLoadingImage}
          undo={undo}
          redo={redo}
          fitImageToArea={fitImageToArea}
          activeTrackingStep={activeTrackingStep}
        />

        <HiddenInput
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadChange}
        />
      </Overlay>
    </Dialog>
  );
}
