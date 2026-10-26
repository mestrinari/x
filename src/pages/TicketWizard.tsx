import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  GitBranch,
  List,
  Network,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  Workflow,
} from "lucide-react";
import { useDirectory } from "../app/Directory";
import { loadTicket, errorMessage } from "../api/resources";
import { saveTicket } from "../api/saveTicket";
import { editableStageStates } from "../api/stageState";
import { executeStage } from "../api/executions";
import { api } from "../api";
import { ActivityRecords } from "../components/ActivityRecords";
import { ConditionRecords } from "../components/ConditionRecords";
import EtapaMensagens from "../etapa-mensagens/EtapaMensagens";
import { etapaMensagensApi } from "../etapa-mensagens/api";
import type { Dependency, Flow, Stage, Ticket } from "../types";
import { Badge, Button, Chip, Field, Input, Modal, Select, Textarea, Toggle } from "../components/ui";
import { PageHeader } from "../components/layout";
import { FlowCanvas } from "../components/FlowCanvas";
import { TicketImages } from "../components/TicketImages";
import { moveTicketImageDrafts, getTicketImageDrafts, includeTicketImage, useTicketImageDrafts } from "../components/ImageEditorModal/ticketImageDrafts";
import { imagemPayload, saveTicketImage } from "../api/ticketImages";

const tabs = ["Dados gerais", "Pessoas", "Fluxos", "Etapas", "Dependências", "Mensagens", "Histórico"];
const blankTicket: Ticket = {
  id: "novo",
  title: "",
  description: "",
  priority: "Média",
  status: "Aberto",
  category: "",
  createdAt: new Date().toLocaleDateString("pt-BR"),
  requesterId: "",
  creatorId: "",
  assigneeIds: [],
  involvedIds: [],
  notes: "",
  flows: [],
  dependencies: [],
};
const clone = <T,>(value: T): T => structuredClone(value);
const tempId = () => crypto.randomUUID();
const storedStage = (stage?: Stage) => Boolean(stage?.remote && stage.active);

function syncOperational(draft: Ticket, fresh: Ticket): Ticket {
  const stages = new Map(fresh.flows.flatMap((flow) => flow.stages.map((stage) => [stage.id, stage] as const)));

  return {
    ...draft,
    flows: draft.flows.map((flow) => ({
      ...flow,
      stages: flow.stages.map((stage) => {
        const freshStage = stages.get(stage.id);

        return freshStage
          ? {
              ...stage,
              executions: freshStage.executions,
              ...(stage.operationalStateDirty
                ? {}
                : {
                    state: freshStage.state,
                    pendingOperationalExecution: undefined,
                    operationalStateDirty: false,
                  }),
            }
          : stage;
      }),
    })),
  };
}

export function TicketWizard() {
  const { id, fluxoId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { actorId } = useDirectory();
  const [ticket, setTicket] = useState<Ticket>(() => clone({ ...blankTicket, creatorId: actorId }));
  const [persisted, setPersisted] = useState<Ticket | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStageId, setSelectedStageId] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [operating, setOperating] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [partialSave, setPartialSave] = useState(false);
  const [operationNeedsRefresh, setOperationNeedsRefresh] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState("APROVADO");
  const operationRef = useRef(false);
  const saveRef = useRef(false);
  const lastSaved = useRef<Ticket | null>(null);
  const isNew = !id;
  const selectedStage = ticket.flows.flatMap((flow) => flow.stages).find((stage) => stage.id === selectedStageId);
  const savedStage = persisted?.flows.flatMap((flow) => flow.stages).find((stage) => stage.id === selectedStageId);
  const imageDrafts = useTicketImageDrafts(actorId, ticket.id);
  const hasChanges = partialSave || imageDrafts.some((image) => image.pending) || JSON.stringify(ticket) !== JSON.stringify(lastSaved.current);
  const update = (patch: Partial<Ticket>) => {
    setNotice("");
    setTicket((current) => ({ ...current, ...patch }));
  };

  useEffect(() => {
    let active = true;

    setError("");
    setNotice("");
    setPartialSave(false);
    setOperationNeedsRefresh(false);
    setSelectedStageId("");
    setActiveTab(fluxoId ? 3 : 0);
    setPersisted(null);
    lastSaved.current = null;
    setTicket(clone({ ...blankTicket, creatorId: actorId }));
    if (!id) {
      const initial = clone({
        ...blankTicket,
        id: "novo",
        createdAt: new Date().toLocaleDateString("pt-BR"),
        creatorId: actorId,
      });

      setTicket(initial);
      setPersisted(null);
      lastSaved.current = null;
      setLoading(false);

      return;
    }

    setLoading(true);
    loadTicket(id)
      .then((data) => {
        if (!active) return;
        setTicket(data);
        setPersisted(data);
        lastSaved.current = clone(data);
        setSelectedStageId(data.flows.find((flow) => flow.id === fluxoId)?.stages[0]?.id ?? data.flows[0]?.stages[0]?.id ?? "");
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, revision]);

  useEffect(() => {
    if (!fluxoId) return;
    setActiveTab(3);
    setSelectedStageId(ticket.flows.find((flow) => flow.id === fluxoId)?.stages[0]?.id ?? "");
  }, [fluxoId]);

  useEffect(() => {
    if (isNew && actorId) setTicket((current) => (current.creatorId ? current : { ...current, creatorId: actorId }));
  }, [actorId, isNew]);

  useEffect(() => {
    if (loading || ticket.id !== id) return;
    const query = new URLSearchParams(location.search);
    const etapaId = query.get("etapaId");

    if (etapaId && ticket.flows.some((f) => f.stages.some((s) => s.id === etapaId))) {
      setSelectedStageId(etapaId);
      setActiveTab(query.get("aba") === "mensagens" ? 5 : 3);
    }
  }, [id, loading, location.key]);

  async function save(final = false) {
    if (saveRef.current || operationRef.current || loading || operationNeedsRefresh || sendingImage) return;
    if (!ticket.title.trim()) {
      setActiveTab(0);
      setError("Informe o título do chamado.");

      return;
    }

    saveRef.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      for (const image of getTicketImageDrafts(actorId, ticket.id).filter((image) => image.pending)) await imagemPayload(image);
      const saved = await saveTicket(
        {
          ...ticket,
          status: final && isNew ? ticket.status : !ticket.remote ? "Rascunho" : ticket.status,
        },
        actorId,
        (checkpoint) => {
          moveTicketImageDrafts(actorId, ticket.id, checkpoint.id);
          setTicket(clone(checkpoint));
          setPartialSave(true);
        }
      );

      for (const [order, image] of getTicketImageDrafts(actorId, saved.id).entries()) {
        if (!image.pending) continue;
        const result = await saveTicketImage(saved.id, image, actorId, order, (progress) => includeTicketImage(actorId, saved.id, progress));

        includeTicketImage(actorId, saved.id, {
          ...image,
          imagemId: result.id,
          versaoImagem: result.versao,
          pending: false,
        });

        setTicket(clone(saved));
      }

      setTicket(clone(saved));
      setPersisted(clone(saved));
      lastSaved.current = clone(saved);
      setPartialSave(false);
      setNotice("Alterações administrativas salvas.");
      if (isNew) navigate(`/chamados/${saved.id}`, { replace: true });
    } catch (e) {
      setError(`${errorMessage(e)} Algumas alterações podem ter sido persistidas. Os checkpoints foram preservados para nova tentativa.`);
    } finally {
      saveRef.current = false;
      setSaving(false);
    }
  }

  async function operate(action: "start" | "finish" | "reopen") {
    if (!savedStage || !selectedStage || !actorId || operationRef.current || saveRef.current || operationNeedsRefresh || partialSave) return;
    if (selectedStage.operationalStateDirty) {
      setError("Salve a alteração do estado operacional antes de executar um comando nesta etapa.");
      setActiveTab(3);

      return;
    }

    operationRef.current = true;
    setOperating(true);
    setError("");
    setNotice("");
    try {
      const execution = await executeStage(savedStage, action, actorId, result);

      setOperationNeedsRefresh(true);
      try {
        await api.historicos.etapas.create({
          etapaId: savedStage.id,
          tipoEvento: action === "finish" ? "EXECUCAO_CONCLUIDA" : action === "reopen" ? "ETAPA_REABERTA" : "EXECUCAO_INICIADA",
          entidadeRelacionadaId: execution.id,
          criadoPor: Number(actorId),
          dadosNovos: JSON.stringify(execution),
        });
      } catch (e) {
        setError(`Execução registrada, mas não foi possível gravar o histórico: ${errorMessage(e)}`);
      }

      const refreshed = await loadTicket(id!);

      setPersisted(refreshed);
      setOperationNeedsRefresh(false);
      setTicket((current) => syncOperational(current, refreshed));
      if (lastSaved.current) lastSaved.current = syncOperational(lastSaved.current, refreshed);
      setNotice("Operação executada e dados operacionais atualizados.");
      setResult("APROVADO");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      operationRef.current = false;
      setOperating(false);
    }
  }

  function leave() {
    if (hasChanges && !window.confirm("Existem alterações administrativas não salvas. Deseja sair e descartá-las?")) return;
    navigate("/chamados");
  }

  if (loading)
    return (
      <div className="empty-state" role="status">
        Carregando chamado...
      </div>
    );
  if (id && !ticket.remote)
    return (
      <div className="empty-state" role="alert">
        <p>{error || "Chamado não encontrado."}</p>
        <Button onClick={() => setRevision((v) => v + 1)}>Tentar novamente</Button>
      </div>
    );

  return (
    <div className="wizard-page">
      <PageHeader
        eyebrow={`Chamados / ${isNew ? "Novo" : ticket.id}`}
        title={isNew ? "Criar chamado" : ticket.title || "Gerenciar chamado"}
        description={isNew ? "Configure o chamado e salve para habilitar execuções e mensagens." : "Visualize, edite e execute sem alternar entre páginas."}
        actions={
          <>
            <Button type="button" variant="secondary" onClick={leave}>
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button type="button" disabled={saving || sendingImage || operating || operationNeedsRefresh || !hasChanges} onClick={() => void save(false)}>
              <Save size={16} /> {saving ? "Salvando..." : isNew ? "Salvar rascunho" : "Salvar alterações"}
            </Button>
          </>
        }
      />
      <TicketImages ticket={ticket} actorId={actorId} showGallery={true} disabled={saving || operating} onSending={setSendingImage} />
      {error && (
        <div className="info-callout detail-api-state" role="alert">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <Button type="button" variant="ghost" onClick={() => setError("")}>
            Fechar
          </Button>
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {notice}
        </div>
      )}
      {operationNeedsRefresh && (
        <div className="info-callout" role="alert">
          A operação foi gravada, mas os dados precisam ser atualizados antes de executar outra ação.
          <Button
            disabled={operating}
            onClick={async () => {
              setOperating(true);
              try {
                const fresh = await loadTicket(id!);

                setPersisted(fresh);
                setTicket((current) => syncOperational(current, fresh));
                if (lastSaved.current) lastSaved.current = syncOperational(lastSaved.current, fresh);
                setOperationNeedsRefresh(false);
                setError("");
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setOperating(false);
              }
            }}
          >
            Atualizar execuções
          </Button>
        </div>
      )}
      {!actorId && <div className="info-callout">Selecione o operador no menu lateral para salvar, executar ou enviar mensagens.</div>}
      {hasChanges && !isNew && <p className="field-help">Existem alterações administrativas pendentes. Operações imediatas não salvarão essas alterações.</p>}
      <div className="internal-tabs" role="tablist" aria-label="Gerenciamento do chamado">
        {tabs.map((label, i) => (
          <button key={label} type="button" role="tab" aria-selected={activeTab === i} className={activeTab === i ? "active" : ""} onClick={() => setActiveTab(i)}>
            {label}
          </button>
        ))}
      </div>
      <fieldset className="wizard-content" disabled={saving || operating} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {activeTab === 0 && <GeneralTab ticket={ticket} update={update} />}
        {activeTab === 1 && <PeopleTab ticket={ticket} update={update} />}
        {activeTab === 2 && <FlowsTab ticket={ticket} update={update} onContinue={() => setActiveTab(3)} />}
        {activeTab === 3 && (
          <StagesTab
            ticket={ticket}
            update={update}
            selectedStageId={selectedStageId}
            onSelectStage={setSelectedStageId}
            initialFlowId={fluxoId}
            renderOperation={(stage) => (
              <StageOperation
                stage={stage}
                savedStage={persisted?.flows.flatMap((f) => f.stages).find((s) => s.id === stage.id)}
                actorId={actorId}
                operating={operating || operationNeedsRefresh || partialSave}
                result={result}
                onResult={setResult}
                onExecute={operate}
                onMessages={() => {
                  setSelectedStageId(stage.id);
                  setActiveTab(5);
                }}
                onHistory={() => {
                  setSelectedStageId(stage.id);
                  setActiveTab(6);
                }}
              />
            )}
            renderMessages={(stage) => <StageMessages stage={stage} savedStage={persisted?.flows.flatMap((f) => f.stages).find((s) => s.id === stage.id)} actorId={actorId} />}
          />
        )}
        {activeTab === 4 && <DependenciesTab ticket={ticket} update={update} />}
      </fieldset>
      {activeTab === 5 &&
        (savedStage && actorId ? (
          <section className="surface">
            <StagePicker ticket={ticket} selected={selectedStageId} onSelect={setSelectedStageId} />
            <EtapaMensagens etapaId={savedStage.id} usuarioAtualId={Number(actorId)} api={etapaMensagensApi} />
          </section>
        ) : (
          <section className="surface empty-inline">
            <StagePicker ticket={ticket} selected={selectedStageId} onSelect={setSelectedStageId} />
            <p>Selecione uma etapa já salva e um operador válido para utilizar as mensagens.</p>
          </section>
        ))}
      {activeTab === 6 &&
        (persisted ? (
          <>
            <StagePicker ticket={ticket} selected={selectedStageId} onSelect={setSelectedStageId} />
            <ActivityRecords ticket={persisted} mode="executions" />
            <ActivityRecords ticket={persisted} mode="history" />
            <ConditionRecords ticket={persisted} />
          </>
        ) : (
          <ReviewTab ticket={ticket} onEdit={setActiveTab} />
        ))}
      <div className="wizard-footer">
        <span>
          {isNew ? "Novo chamado" : `Chamado ${ticket.id}`} <small>{hasChanges ? "Alterações administrativas pendentes" : "Sem alterações administrativas pendentes"}</small>
        </span>
        <div>
          {activeTab > 0 && (
            <Button type="button" variant="secondary" onClick={() => setActiveTab((v) => v - 1)}>
              Anterior
            </Button>
          )}
          {activeTab < 6 && (
            <Button type="button" variant="secondary" onClick={() => setActiveTab((v) => v + 1)}>
              Próxima aba <ChevronRight size={16} />
            </Button>
          )}
          {isNew && (
            <Button type="button" disabled={saving || operating || !actorId} onClick={() => void save(true)}>
              Criar chamado
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function StageMessages({ stage, savedStage, actorId }: { stage: Stage; savedStage?: Stage; actorId: string }) {
  return (
    <section className="surface" style={{ marginTop: 16, padding: 20 }} aria-label={`Mensagens da etapa ${stage.name}`}>
      <div className="surface-head">
        <div>
          <h3>Conversa da etapa</h3>
          <p>Mensagens e menções são registradas imediatamente, sem salvar as alterações administrativas.</p>
        </div>
      </div>
      {!storedStage(savedStage) ? (
        <p className="info-callout">Salve a etapa antes de enviar mensagens.</p>
      ) : !actorId ? (
        <p className="info-callout">Selecione o operador para utilizar as mensagens.</p>
      ) : (
        <EtapaMensagens key={savedStage!.id} etapaId={savedStage!.id} usuarioAtualId={Number(actorId)} api={etapaMensagensApi} />
      )}
    </section>
  );
}

function StagePicker({ ticket, selected, onSelect }: { ticket: Ticket; selected: string; onSelect: (id: string) => void }) {
  return (
    <div className="form-section">
      <Field label="Etapa selecionada">
        <Select value={selected} onChange={(event) => onSelect(event.target.value)}>
          <option value="">Selecione uma etapa</option>
          {ticket.flows
            .filter((f) => f.active)
            .flatMap((flow) =>
              flow.stages
                .filter((s) => s.active)
                .map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {flow.name} · {stage.name}
                  </option>
                ))
            )}
        </Select>
      </Field>
    </div>
  );
}

function StageOperation({
  stage,
  savedStage,
  actorId,
  operating,
  result,
  onResult,
  onExecute,
  onMessages,
  onHistory,
}: {
  stage: Stage;
  savedStage?: Stage;
  actorId: string;
  operating: boolean;
  result: string;
  onResult: (value: string) => void;
  onExecute: (action: "start" | "finish" | "reopen") => Promise<void>;
  onMessages: () => void;
  onHistory: () => void;
}) {
  const enabled = storedStage(savedStage) && Boolean(actorId) && !operating && !stage.operationalStateDirty;

  return (
    <section className="surface" style={{ marginTop: 16, padding: 20 }} aria-label="Operação da etapa">
      <div className="surface-head">
        <div>
          <h3>Execução da etapa</h3>
          <p>As operações abaixo são enviadas imediatamente à API e não salvam alterações administrativas.</p>
        </div>
        <Badge tone={savedStage?.state === "Concluída" ? "green" : "blue"}>{savedStage?.state ?? "Não persistida"}</Badge>
      </div>
      {!savedStage && <p className="info-callout">Salve o chamado e a etapa antes de iniciar execuções ou enviar mensagens.</p>}
      {stage.operationalStateDirty && <p className="info-callout">O estado operacional foi alterado no formulário. Salve essa alteração antes de iniciar outra execução.</p>}
      {savedStage?.state === "Em andamento" && (
        <Field label="Resultado da execução">
          <Input maxLength={100} value={result} onChange={(e) => onResult(e.target.value)} />
        </Field>
      )}
      <div className="row-actions" style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {savedStage?.state === "Disponível" && (
          <Button type="button" disabled={!enabled} onClick={() => void onExecute("start")}>
            Iniciar execução
          </Button>
        )}
        {savedStage?.state === "Em andamento" && (
          <Button type="button" disabled={!enabled || !result.trim()} onClick={() => void onExecute("finish")}>
            Concluir etapa
          </Button>
        )}
        {savedStage?.state === "Concluída" && (
          <Button type="button" disabled={!enabled} variant="secondary" onClick={() => void onExecute("reopen")}>
            Reabrir etapa
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onMessages}>
          Mensagens da etapa
        </Button>
        <Button type="button" variant="ghost" onClick={onHistory}>
          Histórico e condições
        </Button>
      </div>
    </section>
  );
}

function GeneralTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  return (
    <section className="form-section">
      <div className="section-heading">
        <h2>Dados do chamado</h2>
      </div>
      <div className="form-grid">
        <Field label="Título do chamado">
          <Input required maxLength={200} value={ticket.title} onChange={(e) => update({ title: e.target.value })} />
        </Field>
        <Field label="Descrição detalhada">
          <Textarea value={ticket.description} onChange={(e) => update({ description: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={ticket.status} onChange={(e) => update({ status: e.target.value })}>
            {["Rascunho", "Aberto", "Em andamento", "Aguardando", "Concluído"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Select>
        </Field>
        <div className="split-fields">
          <Field label="Data de criação">
            <Input readOnly value={ticket.createdAt} />
          </Field>
          <Field label="Identificador">
            <Input readOnly value={ticket.id === "novo" ? "Gerado ao salvar" : ticket.id} />
          </Field>
        </div>
      </div>
    </section>
  );
}

function MultiUser({ label, value, onChange, hint }: { label: string; value: string[]; onChange: (ids: string[]) => void; hint?: string }) {
  const { users: records, types, userName } = useDirectory();
  const users = records.map((u) => ({
    id: String(u.id),
    name: u.nome,
    active: u.ativo,
    role: types.find((t) => t.id === u.usuarioTipoId)?.nome ?? "",
  }));
  const [selected, setSelected] = useState("");

  return (
    <Field label={label} hint={hint}>
      <div className="multi-select">
        <div className="chips">
          {value.map((id) => (
            <Chip key={id} onRemove={() => onChange(value.filter((item) => item !== id))}>
              {userName(id)}
            </Chip>
          ))}
        </div>
        <div className="select-add">
          <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Selecione uma pessoa</option>
            {users
              .filter((user) => user.active && !value.includes(user.id))
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.role}
                </option>
              ))}
          </Select>
          <Button
            type="button"
            variant="secondary"
            disabled={!selected}
            onClick={() => {
              onChange([...value, selected]);
              setSelected("");
            }}
          >
            <UserPlus size={16} /> Adicionar
          </Button>
        </div>
      </div>
    </Field>
  );
}

function PeopleTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  const { users } = useDirectory();

  return (
    <section className="form-section">
      <div className="section-heading">
        <h2>Pessoas</h2>
      </div>
      <div className="form-grid">
        <Field label="Usuário criador">
          <Select disabled={Boolean(ticket.remote)} value={ticket.creatorId} onChange={(e) => update({ creatorId: e.target.value })}>
            <option value="">Selecione...</option>
            {users
              .filter((u) => u.ativo || String(u.id) === ticket.creatorId)
              .map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Responsável geral">
          <Select value={ticket.assigneeIds[0] ?? ""} onChange={(e) => update({ assigneeIds: e.target.value ? [e.target.value] : [] })}>
            <option value="">Sem responsável</option>
            {users
              .filter((u) => u.ativo || ticket.assigneeIds.includes(String(u.id)))
              .map((u) => (
                <option key={u.id} value={String(u.id)}>
                  {u.nome}
                </option>
              ))}
          </Select>
        </Field>
      </div>
    </section>
  );
}

function FlowsTab({ ticket, update, onContinue }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void; onContinue: () => void }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [initialStatus, setInitialStatus] = useState<Flow["status"]>("Rascunho");
  const add = () => {
    if (!name) return;
    update({
      flows: [
        ...ticket.flows,
        {
          id: tempId(),
          name,
          description: "",
          status: initialStatus,
          stages: [],
          active: true,
          createdAt: new Date().toLocaleDateString("pt-BR"),
          allowChanges: true,
        },
      ],
    });
    setName("");
    setCreating(false);
  };

  if (!ticket.flows.length && !creating)
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Workflow size={26} />
        </span>
        <h2>Este chamado ainda não possui fluxos</h2>
        <p>Os fluxos são opcionais. Você pode criar o chamado normalmente ou organizar o atendimento em etapas personalizadas.</p>
        <div>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} /> Criar primeiro fluxo
          </Button>
          <Button variant="secondary" onClick={onContinue}>
            Continuar sem fluxo
          </Button>
        </div>
        <small>Um fluxo vazio também é válido. Você pode adicionar etapas depois.</small>
      </div>
    );

  return (
    <section className="form-section">
      <div className="section-heading with-action">
        <div>
          <h2>Fluxos do chamado</h2>
          <p>Organize diferentes frentes de trabalho sem exigir uma estrutura fixa.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} /> Novo fluxo
        </Button>
      </div>
      {creating && (
        <div className="inline-creator">
          <Field label="Nome do fluxo">
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Aprovação técnica" />
          </Field>
          <Field label="Situação inicial">
            <Select value={initialStatus} onChange={(e) => setInitialStatus(e.target.value as Flow["status"])}>
              <option>Rascunho</option>
              <option>Ativo</option>
            </Select>
          </Field>
          <div className="inline-actions">
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button onClick={add}>Criar fluxo vazio</Button>
          </div>
        </div>
      )}
      <div className="flow-list">
        {ticket.flows.map((flow) => (
          <div className={`flow-row ${!flow.active ? "deleted" : ""}`} key={flow.id}>
            <span className="flow-symbol">
              <GitBranch size={18} />
            </span>
            <div>
              <Input
                aria-label="Nome do fluxo"
                maxLength={150}
                value={flow.name}
                onChange={(e) =>
                  update({
                    flows: ticket.flows.map((f) => (f.id === flow.id ? { ...f, name: e.target.value } : f)),
                  })
                }
              />
              <Input
                aria-label="Descrição do fluxo"
                maxLength={1000}
                value={flow.description}
                onChange={(e) =>
                  update({
                    flows: ticket.flows.map((f) => (f.id === flow.id ? { ...f, description: e.target.value } : f)),
                  })
                }
              />
              <small>Criado em {flow.createdAt}</small>
            </div>
            <div className="flow-stats">
              <span>
                <strong>{flow.stages.length}</strong> etapas
              </span>
              <span>
                <strong>{flow.stages.filter((stage) => stage.active).length}</strong> ativas
              </span>
              <span>
                <strong>{new Set(flow.stages.flatMap((stage) => stage.assigneeIds)).size}</strong> responsáveis
              </span>
            </div>
            <Badge tone={flow.active ? "green" : "red"}>{flow.active ? flow.status : "Excluído"}</Badge>
            <div className="row-actions">
              <Button
                variant="ghost"
                onClick={() =>
                  update({
                    flows: [
                      ...ticket.flows,
                      {
                        ...flow,
                        id: crypto.randomUUID(),
                        remote: undefined,
                        name: flow.name + " (cópia)",
                        stages: flow.stages.map((s) => ({
                          ...s,
                          id: crypto.randomUUID(),
                          remote: undefined,
                          executions: [],
                          state: "Não iniciada",
                          operationalStateDirty: true,
                          pendingOperationalExecution: undefined,
                        })),
                      },
                    ],
                  })
                }
              >
                <Copy size={15} /> Duplicar
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  update({
                    flows: ticket.flows.map((item) => (item.id === flow.id ? { ...item, active: !item.active } : item)),
                  })
                }
              >
                {flow.active ? (
                  <>
                    <Trash2 size={15} /> Excluir
                  </>
                ) : (
                  <>
                    <RotateCcw size={15} /> Restaurar
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StagesTab({
  ticket,
  update,
  selectedStageId,
  onSelectStage,
  initialFlowId,
  renderOperation,
  renderMessages,
}: {
  ticket: Ticket;
  update: (patch: Partial<Ticket>) => void;
  selectedStageId: string;
  onSelectStage: (id: string) => void;
  initialFlowId?: string;
  renderOperation: (stage: Stage) => React.ReactNode;
  renderMessages: (stage: Stage) => React.ReactNode;
}) {
  const activeFlows = ticket.flows.filter((flow) => flow.active);
  const [flowId, setFlowId] = useState(initialFlowId ?? activeFlows[0]?.id ?? "");
  const flow = ticket.flows.find((item) => item.id === flowId);
  const stageId = selectedStageId;
  const setStageId = onSelectStage;
  const selected = flow?.stages.find((stage) => stage.id === stageId);
  const setFlow = (next: Flow) => update({ flows: ticket.flows.map((item) => (item.id === next.id ? next : item)) });
  const addStage = () => {
    if (!flow) return;
    const newStage: Stage = {
      id: tempId(),
      name: "Nova etapa",
      description: "Descreva o objetivo desta etapa.",
      assigneeIds: [],
      state: "Não iniciada",
      operationalStateDirty: false,
      convergence: "Todas",
      active: true,
      reprocessing: false,
      simultaneous: false,
      maxExecutions: 1,
      executions: [],
    };

    setFlow({ ...flow, stages: [...flow.stages, newStage] });
    setStageId(newStage.id);
  };

  useEffect(() => {
    if (flow && !flow.stages.some((s) => s.id === stageId)) setStageId(flow.stages[0]?.id ?? "");
    if (!activeFlows.some((f) => f.id === flowId)) setFlowId(activeFlows[0]?.id ?? "");
  }, [ticket.flows, flowId, stageId]);
  const updateStage = (patch: Partial<Stage>) => {
    if (!selected || !flow) return;
    setFlow({
      ...flow,
      stages: flow.stages.map((stage) => (stage.id === selected.id ? { ...stage, ...patch } : stage)),
    });
  };

  if (!activeFlows.length)
    return (
      <div className="empty-state small">
        <span className="empty-icon">
          <GitBranch size={25} />
        </span>
        <h2>Crie um fluxo antes de adicionar etapas</h2>
        <p>Volte à aba Fluxos. O fluxo pode ser criado vazio e configurado gradualmente.</p>
      </div>
    );

  return (
    <div className="stage-workspace">
      <section className="stage-list-panel">
        <div className="panel-header">
          <div>
            <h2>Etapas</h2>
            <p>Selecione uma etapa para configurar.</p>
          </div>
          <Button onClick={addStage}>
            <Plus size={15} /> Nova etapa
          </Button>
        </div>
        <Select
          value={flowId}
          onChange={(e) => {
            setFlowId(e.target.value);
            setStageId(ticket.flows.find((f) => f.id === e.target.value)?.stages[0]?.id ?? "");
          }}
        >
          {activeFlows.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.stages.length} etapas
            </option>
          ))}
        </Select>
        <div className="stage-list">
          {flow?.stages.map((stage, index) => (
            <button key={stage.id} className={`stage-list-item ${stage.id === stageId ? "active" : ""} ${!stage.active ? "deleted" : ""}`} onClick={() => setStageId(stage.id)}>
              <span className="step-number">{index + 1}</span>
              <span>
                <strong>{stage.name}</strong>
                <small>
                  {stage.assigneeIds.length ? `${stage.assigneeIds.length} responsáveis` : "Sem responsável"} ·{" "}
                  {ticket.dependencies.filter((dep) => dep.targetStageId === stage.id).length} dependências
                </small>
              </span>
              <Badge tone={stage.active ? "blue" : "red"}>{stage.active ? stage.state : "Excluída"}</Badge>
            </button>
          ))}
        </div>
      </section>
      <section className="stage-editor">
        {selected ? (
          <>
            <div className="panel-header">
              <div>
                <span className="eyebrow">{flow?.name}</span>
                <h2>Configurar etapa</h2>
              </div>
              <div className="row-actions">
                <Button
                  variant="ghost"
                  onClick={() =>
                    flow &&
                    setFlow({
                      ...flow,
                      stages: [
                        ...flow.stages,
                        {
                          ...selected,
                          remote: undefined,
                          id: tempId(),
                          name: `${selected.name} (cópia)`,
                          state: "Não iniciada",
                          operationalStateDirty: false,
                          pendingOperationalExecution: undefined,
                          executions: [],
                        },
                      ],
                    })
                  }
                >
                  <Copy size={15} /> Duplicar
                </Button>
                <Button variant="ghost" onClick={() => updateStage({ active: !selected.active })}>
                  {selected.active ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                  {selected.active ? "Excluir" : "Restaurar"}
                </Button>
              </div>
            </div>
            {selected.executions.length > 0 && (
              <div className="history-note">
                <CheckCircle2 size={16} /> Esta etapa possui {selected.executions.length} execução histórica. As alterações não apagam resultados anteriores.
              </div>
            )}
            <div className="editor-sections">
              <details open>
                <summary>
                  <span>
                    <strong>Informações da etapa</strong>
                    <small>Nome, descrição e estado administrativo</small>
                  </span>
                  <ChevronDown size={18} />
                </summary>
                <div className="details-content">
                  <div className="split-fields">
                    <Field label="Status administrativo" hint="Códigos 0, 1 e 2 definidos pelo contrato da API.">
                      <Select
                        value={selected.administrativeStatus ?? selected.remote?.statusAdministrativo ?? 0}
                        onChange={(e) => updateStage({ administrativeStatus: Number(e.target.value) })}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </Select>
                    </Field>
                    <Field label="Ordem visual">
                      <Input
                        type="number"
                        step={1}
                        min={-2147483648}
                        max={2147483647}
                        value={selected.visualOrder ?? ""}
                        onChange={(e) =>
                          updateStage({
                            visualOrder: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Nome da etapa">
                    <Input maxLength={150} value={selected.name} onChange={(e) => updateStage({ name: e.target.value })} />
                  </Field>
                  <Field label="Descrição detalhada">
                    <Textarea value={selected.description} onChange={(e) => updateStage({ description: e.target.value })} />
                  </Field>
                  <div className="split-fields">
                    <Field label="Disponibilidade do registro">
                      <Select value={selected.active ? "Ativa" : "Excluída"} onChange={(e) => updateStage({ active: e.target.value === "Ativa" })}>
                        <option>Ativa</option>
                        <option>Excluída</option>
                      </Select>
                    </Field>
                    <Field
                      label="Estado operacional"
                      hint="Permite todos os estados previstos no modelo. A alteração é registrada ao salvar, independentemente dos comandos de execução imediata."
                    >
                      <Select
                        value={selected.state}
                        onChange={(e) =>
                          updateStage({
                            state: e.target.value as Stage["state"],
                            operationalStateDirty: true,
                            pendingOperationalExecution: undefined,
                          })
                        }
                      >
                        {editableStageStates.map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                </div>
              </details>
              <details open>
                <summary>
                  <span>
                    <strong>Responsáveis</strong>
                    <small>Pessoas atribuídas à etapa</small>
                  </span>
                  <ChevronDown size={18} />
                </summary>
                <div className="details-content">
                  <MultiUser label="Responsáveis da etapa" value={selected.assigneeIds} onChange={(assigneeIds) => updateStage({ assigneeIds })} />
                </div>
              </details>
              <details>
                <summary>
                  <span>
                    <strong>Convergência e execuções</strong>
                    <small>Dependências, reprocessamento e opções avançadas</small>
                  </span>
                  <ChevronDown size={18} />
                </summary>
                <div className="details-content">
                  <Field label="Modo de convergência">
                    <Select value={selected.convergence} onChange={(e) => updateStage({ convergence: e.target.value as Stage["convergence"] })}>
                      <option>Todas</option>
                      <option>Qualquer</option>
                    </Select>
                  </Field>
                  <p className="field-help">Modo de convergência registrado para a etapa. A API atual não libera etapas automaticamente.</p>
                  <div className="split-fields">
                    <Toggle
                      checked={selected.manualCompletion ?? selected.remote?.exigirConclusaoManual ?? true}
                      onChange={(manualCompletion) => updateStage({ manualCompletion })}
                      label="Exigir conclusão manual"
                      hint="Grava a exigência de conclusão manual da etapa."
                    />
                    <Toggle
                      checked={selected.simultaneous}
                      onChange={(simultaneous) => updateStage({ simultaneous })}
                      label="Execuções simultâneas"
                      hint="Permite trabalho paralelo nesta etapa."
                    />
                  </div>
                </div>
              </details>
            </div>
            {renderOperation(selected)}
            {renderMessages(selected)}
          </>
        ) : (
          <div className="empty-editor">Selecione ou crie uma etapa para começar.</div>
        )}
      </section>
    </div>
  );
}

function DependenciesTab({ ticket, update }: { ticket: Ticket; update: (patch: Partial<Ticket>) => void }) {
  const [mode, setMode] = useState<"list" | "map">("list");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const allStages = ticket.flows.filter((flow) => flow.active).flatMap((flow) => flow.stages.filter((stage) => stage.active).map((stage) => ({ stage, flow })));
  const [draft, setDraft] = useState<Partial<Dependency>>({
    condition: "Resultado da etapa",
    expected: "Concluído",
  });
  const stageName = (id?: string) => allStages.find((item) => item.stage.id === id);
  const add = () => {
    const source = stageName(draft.sourceStageId),
      target = stageName(draft.targetStageId);

    if (!source || !target || source.stage.id === target.stage.id) return;
    const previous = ticket.dependencies.find((d) => d.id === editingId);
    const dependency: Dependency = {
      ...previous,
      id: editingId ?? crypto.randomUUID(),
      sourceFlowId: source.flow.id,
      sourceStageId: source.stage.id,
      targetFlowId: target.flow.id,
      targetStageId: target.stage.id,
      condition: draft.condition ?? "Resultado da etapa",
      expected: draft.expected ?? "",
      active: previous?.active ?? true,
    };

    update({
      dependencies: editingId ? ticket.dependencies.map((d) => (d.id === editingId ? dependency : d)) : [...ticket.dependencies, dependency],
    });
    setCreating(false);
  };

  return (
    <section className="form-section dependency-section">
      <div className="section-heading with-action">
        <div>
          <h2>Regras e dependências</h2>
          <p>Conecte etapas do mesmo fluxo ou de fluxos diferentes.</p>
        </div>
        <div className="segmented">
          <button className={mode === "list" ? "active" : ""} onClick={() => setMode("list")}>
            <List size={15} /> Lista
          </button>
          <button className={mode === "map" ? "active" : ""} onClick={() => setMode("map")}>
            <Network size={15} /> Mapa
          </button>
        </div>
        <Button
          onClick={() => {
            setEditingId(null);
            setDraft({ condition: "Resultado da etapa", expected: "APROVADO" });
            setCreating(true);
          }}
        >
          <Plus size={15} /> Nova dependência
        </Button>
      </div>
      {mode === "map" ? (
        <>
          <div className="map-notice">
            <GitBranch size={16} /> Arraste os nós para organizar a visualização. Ciclos são permitidos e aparecem como retornos.
          </div>
          <FlowCanvas flows={ticket.flows} dependencies={ticket.dependencies} editing />
        </>
      ) : (
        <div className="dependency-list">
          {ticket.dependencies.length ? (
            ticket.dependencies.map((dependency) => {
              const source = stageName(dependency.sourceStageId);
              const target = stageName(dependency.targetStageId);

              return (
                <div className={`dependency-row ${!dependency.active ? "deleted" : ""}`} key={dependency.id}>
                  <div>
                    <small>ORIGEM · {source?.flow.name}</small>
                    <strong>{source?.stage.name}</strong>
                  </div>
                  <span className="dependency-arrow">
                    <ChevronRight size={18} />
                  </span>
                  <div>
                    <small>DESTINO · {target?.flow.name}</small>
                    <strong>{target?.stage.name}</strong>
                  </div>
                  <div>
                    <Badge tone="purple">{dependency.condition}</Badge>
                    <small>Se: {dependency.expected}</small>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setEditingId(dependency.id);
                        setDraft(dependency);
                        setCreating(true);
                      }}
                    >
                      Editar condição
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update({
                        dependencies: ticket.dependencies.map((item) => (item.id === dependency.id ? { ...item, active: !item.active } : item)),
                      })
                    }
                  >
                    {dependency.active ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                    {dependency.active ? "Excluir" : "Restaurar"}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="empty-inline">Nenhuma dependência configurada. Etapas independentes são válidas.</div>
          )}
        </div>
      )}
      {creating && (
        <Modal title={editingId ? "Editar dependência" : "Nova dependência"} onClose={() => setCreating(false)}>
          <div className="modal-body">
            <p className="modal-intro">Escolha a origem, o destino e a condição necessária. Não é permitido código executável.</p>
            <div className="split-fields">
              <Field label="Etapa de origem">
                <Select
                  disabled={Boolean(ticket.dependencies.find((d) => d.id === editingId)?.remote)}
                  value={draft.sourceStageId ?? ""}
                  onChange={(e) => setDraft({ ...draft, sourceStageId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {allStages.map(({ flow, stage }) => (
                    <option key={stage.id} value={stage.id}>
                      {flow.name} · {stage.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Etapa de destino">
                <Select
                  disabled={Boolean(ticket.dependencies.find((d) => d.id === editingId)?.remote)}
                  value={draft.targetStageId ?? ""}
                  onChange={(e) => setDraft({ ...draft, targetStageId: e.target.value })}
                >
                  <option value="">Selecione...</option>
                  {allStages.map(({ flow, stage }) => (
                    <option key={stage.id} value={stage.id}>
                      {flow.name} · {stage.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Tipo de condição">
              <Select value={draft.condition} onChange={(e) => setDraft({ ...draft, condition: e.target.value as Dependency["condition"] })}>
                <option>Conclusão da etapa</option>
                <option>Resultado da etapa</option>
                <option>Escolha manual</option>
                <option>Regra automática</option>
              </Select>
            </Field>
            <Field label="Resultado ou critério esperado" hint={draft.condition === "Regra automática" ? "Informe um objeto JSON válido." : undefined}>
              <Input value={draft.expected} onChange={(e) => setDraft({ ...draft, expected: e.target.value })} />
            </Field>
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button disabled={!draft.sourceStageId || !draft.targetStageId || draft.sourceStageId === draft.targetStageId} onClick={add}>
                Salvar dependência
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

function ReviewTab({ ticket, onEdit }: { ticket: Ticket; onEdit: (tab: number) => void }) {
  const { userName } = useDirectory();
  const [preview, setPreview] = useState<"map" | "list">("map");
  const stageCount = useMemo(() => ticket.flows.reduce((sum, flow) => sum + flow.stages.length, 0), [ticket.flows]);

  return (
    <div className="review-layout">
      <section className="review-main">
        <div className="review-block">
          <div className="review-title">
            <div>
              <h2>Resumo do chamado</h2>
              <p>Revise os dados antes de criar.</p>
            </div>
            <Button variant="ghost" onClick={() => onEdit(0)}>
              Editar
            </Button>
          </div>
          <dl>
            <div>
              <dt>Título</dt>
              <dd>{ticket.title || "Não informado"}</dd>
            </div>
            <div>
              <dt>Criador</dt>
              <dd>{userName(ticket.creatorId)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{ticket.status}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{userName(ticket.assigneeIds[0] ?? "")}</dd>
            </div>
            <div className="wide">
              <dt>Descrição</dt>
              <dd>{ticket.description || "Não informada"}</dd>
            </div>
          </dl>
        </div>
        <div className="review-block">
          <div className="review-title">
            <div>
              <h2>Pré-visualização operacional</h2>
              <p>É assim que a equipe acompanhará o trabalho.</p>
            </div>
            <div className="segmented">
              <button className={preview === "map" ? "active" : ""} onClick={() => setPreview("map")}>
                <Network size={15} /> Mapa
              </button>
              <button className={preview === "list" ? "active" : ""} onClick={() => setPreview("list")}>
                <List size={15} /> Lista
              </button>
            </div>
          </div>
          {preview === "map" ? (
            ticket.flows.length ? (
              <FlowCanvas flows={ticket.flows} dependencies={ticket.dependencies} />
            ) : (
              <div className="empty-inline">Este chamado será criado sem fluxos.</div>
            )
          ) : (
            <div className="preview-list">
              {ticket.flows.flatMap((flow) =>
                flow.stages.map((stage) => (
                  <div key={stage.id}>
                    <span>
                      <strong>{stage.name}</strong>
                      <small>{flow.name}</small>
                    </span>
                    <Badge tone="blue">{stage.state}</Badge>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>
      <aside className="review-aside">
        <h3>Estrutura configurada</h3>
        <div className="summary-number">
          <strong>{ticket.flows.length}</strong>
          <span>fluxos</span>
        </div>
        <div className="summary-number">
          <strong>{stageCount}</strong>
          <span>etapas</span>
        </div>
        <div className="summary-number">
          <strong>{ticket.dependencies.length}</strong>
          <span>dependências</span>
        </div>
        <hr />
        <p>{ticket.flows.filter((flow) => !flow.stages.length).length} fluxos vazios</p>
        <p>{ticket.flows.flatMap((flow) => flow.stages).filter((stage) => stage.assigneeIds.length).length} etapas com responsáveis</p>
        <div className="ready-box">
          <CheckCircle2 size={18} />
          <span>
            <strong>Pronto para criar</strong>
            <small>Você poderá editar tudo depois.</small>
          </span>
        </div>
      </aside>
    </div>
  );
}
