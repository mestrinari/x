import { useEffect, useRef, useState } from "react";
import { ImageIcon, Pencil, Trash2 } from "lucide-react";
import { api } from "../api";
import { allPages, errorMessage } from "../api/resources";
import { chamadoToTicket } from "../api/adapters";
import type { Ticket } from "../types";
import { Button } from "./ui";
import { ImageReferenceProvider } from "./ImageReferenceContext";
import { ImageComments, type ImageCommentsHandle } from "./ImageComments";
import { TicketImageMarkerPreview } from "./ImageEditorModal/TicketImageMarkerPreview";
import {
  FloatingImageEditor,
  useFloatingImageEditor,
} from "./ImageEditorModal/FloatingImageEditor";
import type { TicketImageEvidence } from "./ImageEditorModal/ticketImageEvidence";
import {
  includeTicketImage,
  removeTicketImage,
  useTicketImageDrafts,
  mergeTicketImages,
} from "./ImageEditorModal/ticketImageDrafts";
import {
  imagemPayload,
  loadTicketImages,
  saveTicketImage,
  deleteTicketImage,
} from "../api/ticketImages";

export function canReceiveTicketImage(ticket: Ticket, actorId: string) {
  return (
    Boolean(actorId) &&
    ["Rascunho", "Aberto", "Em andamento", "Aguardando"].includes(ticket.status) &&
    !ticket.remote?.excluidoEm &&
    !ticket.remote?.concluidoEm
  );
  // && (ticket.creatorId === actorId || ticket.assigneeIds.includes(actorId));
}

export function TicketImages({
  ticket,
  actorId,
  showGallery,
  disabled,
  onSending,
}: {
  ticket: Ticket;
  actorId: string;
  showGallery: boolean;
  disabled: boolean;
  onSending: (sending: boolean) => void;
}) {
  const { windowRef, open, setOpen } = useFloatingImageEditor();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<TicketImageEvidence | null>(null);
  const [sending, setSending] = useState(false);
  const commentEditors = useRef(new Map<string, ImageCommentsHandle>());
  const sendLock = useRef(false);
  const savedIdentity = useRef<TicketImageEvidence | null>(null);
  const lastSend = useRef<{ target: string; source: string; evidence: TicketImageEvidence } | null>(
    null
  );
  const context = useRef("");
  context.current = `${actorId}:${ticket.id}`;
  const [imageLoadError, setImageLoadError] = useState("");
  const images = useTicketImageDrafts(actorId, ticket.id);
  const options = [...tickets.filter((item) => item.id !== ticket.id), ticket].filter((item) =>
    canReceiveTicketImage(item, actorId)
  );
  const destination = options.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!ticket.remote) return;
    let active = true;
    setImageLoadError("");
    loadTicketImages(ticket.id)
      .then((images) => {
        if (active) mergeTicketImages(actorId, ticket.id, images);
      })
      .catch((reason) => {
        if (active) setImageLoadError(errorMessage(reason));
      });
    return () => {
      active = false;
    };
  }, [ticket.id, actorId, revision]);

  useEffect(() => {
    setOpen(false);
    setTickets([]);
    setSelectedId("");
    setEditing(null);
    setFeedback("");
  }, [actorId, ticket.id, setOpen]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    setTickets([]);
    // Use only the existing front-end list client; no image endpoint is assumed.
    allPages(api.chamados.list)
      .then((records) => {
        if (active) setTickets(records.map(chamadoToTicket));
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, actorId, revision]);

  function openEditor(evidence: TicketImageEvidence | null = null) {
    lastSend.current = null;
    savedIdentity.current = evidence;
    setEditing(evidence);
    setFeedback("");
    setSelectedId(canReceiveTicketImage(ticket, actorId) ? ticket.id : "");
    setOpen(true);
  }

  async function send(evidence: TicketImageEvidence) {
    if (sendLock.current) return;
    if (disabled || loading || !destination)
      throw new Error("Selecione um chamado ativo disponível para este operador.");
    sendLock.current = true;
    setSending(true);
    onSending(true);
    setFeedback("");
    const origin = context.current;
    const previous =
      lastSend.current?.target === destination.id &&
      lastSend.current.source === evidence.imageDataUrl
        ? lastSend.current.evidence
        : editing && destination.id === ticket.id
          ? savedIdentity.current
          : null;
    const updated = {
      ...evidence,
      ...(previous
        ? { id: previous.id, imagemId: previous.imagemId, versaoImagem: previous.versaoImagem }
        : {}),
      pending: true,
    };
    try {
      await imagemPayload(updated);
      lastSend.current = {
        target: destination.id,
        source: evidence.imageDataUrl,
        evidence: updated,
      };
      includeTicketImage(actorId, destination.id, updated);
      if (destination.remote) {
        const saved = await saveTicketImage(destination.id, updated, actorId, 0, (progress) => {
          includeTicketImage(actorId, destination.id, progress);
          lastSend.current = {
            target: destination.id,
            source: evidence.imageDataUrl,
            evidence: progress,
          };
          if (previous) savedIdentity.current = progress;
        });
        const persisted = {
          ...updated,
          imagemId: saved.id,
          versaoImagem: saved.versao,
          pending: false,
        };
        includeTicketImage(actorId, destination.id, persisted);
        lastSend.current = {
          target: destination.id,
          source: evidence.imageDataUrl,
          evidence: persisted,
        };
        if (previous) savedIdentity.current = persisted;
        if (context.current === origin) {
          setFeedback(`Imagem salva em CH-${destination.id}.`);
        }
      } else if (context.current === origin)
        setFeedback("Imagem incluída. Será enviada ao salvar o novo chamado.");
    } finally {
      sendLock.current = false;
      setSending(false);
      onSending(false);
    }
  }

  async function removeImage(evidence: TicketImageEvidence) {
    if (sendLock.current) return;
    if (
      evidence.imagemId &&
      !window.confirm("Excluir permanentemente esta imagem e suas marcações?")
    )
      return;
    sendLock.current = true;
    setSending(true);
    onSending(true);
    try {
      await deleteTicketImage(evidence);
      removeTicketImage(actorId, ticket.id, evidence.id);
      setImageLoadError("");
    } catch (reason) {
      setImageLoadError(errorMessage(reason));
    } finally {
      sendLock.current = false;
      setSending(false);
      onSending(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || sending}
        onClick={() => openEditor()}
        aria-label="Abrir editor de imagens"
      >
        <ImageIcon size={16} /> Imagens{images.length > 0 ? ` (${images.length})` : ""}
      </Button>
      <FloatingImageEditor
        windowRef={windowRef}
        open={open}
        onOpenChange={setOpen}
        initialImage={editing?.imageDataUrl ?? null}
        initialItems={editing?.editorItems}
        initialTrackingSteps={editing?.trackingSteps}
        onSendToTicket={send}
        sendToTicketLabel={
          editing && destination?.id === ticket.id ? "Atualizar imagem" : "Enviar para chamado"
        }
        sendToTicketDisabled={disabled || sending || loading || !destination}
        ticketControls={
          <div
            style={{
              padding: "10px 16px",
              flexShrink: 0,
              borderBottom: "1px solid var(--card-border)",
            }}
          >
            <label style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              Chamado de destino
              <select
                aria-label="Chamado de destino"
                value={destination ? selectedId : ""}
                disabled={sending || loading || disabled}
                onChange={(event) => {
                  setSelectedId(event.target.value);
                  setFeedback("");
                }}
                style={{
                  padding: 8,
                  maxWidth: "100%",
                  minWidth: 240,
                  color: "var(--foreground)",
                  background: "var(--background)",
                }}
              >
                <option value="">
                  {loading ? "Carregando chamados..." : "Selecione um chamado"}
                </option>
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id === "novo" ? "Novo chamado (em criação)" : `CH-${item.id}`} ·{" "}
                    {item.title || "Sem título"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={loading}
                onClick={() => setRevision((value) => value + 1)}
              >
                Atualizar lista
              </button>
            </label>
            {!loading && !options.length && (
              <p role="status">Nenhum chamado ativo disponível para este operador.</p>
            )}
            {error && <p role="alert">Não foi possível atualizar a lista: {error}</p>}
            {feedback && <p role="status">{feedback}</p>}
            {sending && <p role="status">Enviando imagem...</p>}
            <small>
              Chamados existentes recebem a imagem ao enviar. No novo chamado, salve o cadastro para
              enviar as imagens pendentes.
            </small>
          </div>
        }
      />
      {imageLoadError && (
        <p role="alert">
          Não foi possível carregar as imagens: {imageLoadError}{" "}
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Tentar novamente
          </button>
        </p>
      )}
      {showGallery && images.length > 0 && (
        <section className="form-section" aria-label="Imagens do chamado" style={{ width: "100%" }}>
          <h2>Imagens do chamado ({images.length})</h2>
          <p className="field-help">
            {images.filter((image) => image.pending).length} pendente(s). Imagens pendentes são
            perdidas ao recarregar; salve o chamado para enviá-las.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: 16,
            }}
          >
            {images.map((evidence, index) => (
              <ImageReferenceProvider key={`${evidence.id}:${actorId}`}><article className="surface" style={{ padding: 12 }}>
                <TicketImageMarkerPreview
                  onStepClick={step => commentEditors.current.get(evidence.id)?.referenceStep(step.id)}
                  evidenceId={evidence.id}
                  src={evidence.imageDataUrl}
                  alt={`Imagem ${index + 1} do chamado`}
                  width={evidence.width}
                  height={evidence.height}
                  steps={evidence.steps}
                  editorItems={evidence.editorItems}
                />
                <p>
                  Imagem {index + 1} · {evidence.width} × {evidence.height} ·{" "}
                  {evidence.pending ? "Pendente" : "Salva"}
                </p>
                {evidence.steps.map((step) => (
                  <p key={step.id}>
                    <button type="button" disabled={disabled || sending || !evidence.imagemId}
                      onClick={() => commentEditors.current.get(evidence.id)?.referenceStep(step.id)}>
                      <strong>{step.code} {step.name}</strong>
                    </button>{" "}
                    {step.description}
                  </p>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={disabled || sending}
                    onClick={() => openEditor(evidence)}
                  >
                    <Pencil size={14} /> Editar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled || sending}
                    onClick={() => void removeImage(evidence)}
                    aria-label={`Remover imagem ${index + 1}`}
                  >
                    <Trash2 size={14} /> Remover
                  </Button>
                </div>
                <ImageComments ref={handle => { if (handle) commentEditors.current.set(evidence.id, handle); else commentEditors.current.delete(evidence.id); }} key={`${evidence.imagemId ?? evidence.id}:${actorId}`} imageId={evidence.imagemId} disabled={disabled || sending}/>
              </article></ImageReferenceProvider>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
