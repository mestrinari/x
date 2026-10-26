import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CirclePlay,
  Clock3,
  Edit3,
  History,
  List,
  Network,
  RefreshCw,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { api } from "../api";
import { useDirectory } from "../app/Directory";
import { loadTicket, errorMessage } from "../api/resources";
import { ActivityRecords } from "../components/ActivityRecords";
import { ConditionRecords } from "../components/ConditionRecords";
import { executeStage } from "../api/executions";
import type { Stage, Ticket } from "../types";
import { Badge, Button } from "../components/ui";
import { PageHeader } from "../components/layout";
import { FlowCanvas } from "../components/FlowCanvas";
import EtapaMensagens from "../etapa-mensagens/EtapaMensagens";
import { etapaMensagensApi } from "../etapa-mensagens/api";

const tone = (state: Stage["state"]) =>
  state === "Concluída"
    ? "green"
    : state === "Disponível" || state === "Em andamento"
      ? "blue"
      : state.includes("Aguardando")
        ? "amber"
        : "neutral";

export function TicketDetail() {
  const { id, fluxoId } = useParams();
  const navigate = useNavigate();
  const { userName, actorId } = useDirectory();
  const [source, setSource] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [tab, setTab] = useState(1);
  const [view, setView] = useState<"list" | "map">("list");
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState("APROVADO");
  const flows = source?.flows ?? [];
  const selected = flows
    .flatMap((f) => f.stages)
    .find((s) => s.id === selectedId);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setApiError("");
    loadTicket(id!)
      .then((ticket) => {
        if (!active) return;
        setSource(ticket);
        setSelectedId((previous) =>
          ticket.flows.some((f) => f.stages.some((s) => s.id === previous))
            ? previous
            : (ticket.flows
                .flatMap((f) => f.stages)
                .find((s) => s.state === "Em andamento")?.id ??
              ticket.flows.find((f) => f.id === fluxoId)?.stages[0]?.id ??
              ticket.flows[0]?.stages[0]?.id ??
              ""),
        );
      })
      .catch((e) => {
        if (active) {
          setApiError(errorMessage(e));
          setSource(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, reloadKey]);
  async function mutate(action: "start" | "finish" | "reopen") {
    if (!selected || !actorId || mutationLoading) return;
    setMutationLoading(true);
    setMutationError(null);
    try {
      const execution = await executeStage(selected, action, actorId, result);

      try {
        await api.historicos.etapas.create({
          etapaId: selected.id,
          tipoEvento:
            action === "finish"
              ? "EXECUCAO_CONCLUIDA"
              : action === "reopen"
                ? "ETAPA_REABERTA"
                : "EXECUCAO_INICIADA",
          entidadeRelacionadaId: execution.id,
          criadoPor: Number(actorId),
          dadosNovos: JSON.stringify(execution),
        });
      } catch (e) {
        setMutationError(
          "Execução salva, mas o histórico não foi registrado: " +
            errorMessage(e),
        );
      }

      setReloadKey((x) => x + 1);
    } catch (e) {
      setMutationError(errorMessage(e));
    } finally {
      setMutationLoading(false);
    }
  }

  const start = () => mutate("start"),
    finish = () => mutate("finish"),
    reopen = () => mutate("reopen");

  if (loading)
    return (
      <div className="empty-state" role="status">
        Carregando chamado...
      </div>
    );
  if (!source)
    return (
      <div className="empty-state" role="alert">
        <p>{apiError || "Chamado não encontrado."}</p>
        <Button onClick={() => setReloadKey((x) => x + 1)}>
          Tentar novamente
        </Button>
      </div>
    );

  return (
    <>
      <PageHeader
        eyebrow={`Chamados / ${source.id}`}
        title={source.title}
        description={source.description}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/chamados")}>
              <ArrowLeft size={16} /> Voltar
            </Button>
            <Button onClick={() => navigate(`/chamados/${source.id}/editar`)}>
              <Edit3 size={16} /> Editar chamado
            </Button>
          </>
        }
      />
      {loading && (
        <div className="info-callout detail-api-state" role="status">
          <span className="loading-indicator" aria-hidden="true" /> Carregando
          dados do chamado e seus fluxos...
        </div>
      )}
      {apiError && (
        <div className="info-callout detail-api-state" role="alert">
          <span>{apiError}</span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            <RefreshCw size={15} /> Tentar novamente
          </Button>
        </div>
      )}
      {mutationError && (
        <div className="info-callout detail-api-state" role="alert">
          <span>{mutationError}</span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setMutationError(null)}
          >
            Fechar
          </Button>
        </div>
      )}
      <div className="ticket-meta">
        <Badge tone="blue">{source.status}</Badge>
        <span>Aberto em {source.createdAt}</span>
        <span>
          <UserRound size={15} /> {userName(source.creatorId)}
        </span>
      </div>
      <div className="detail-tabs">
        {[
          "Visão geral",
          "Fluxos e Etapas",
          "Execuções",
          "Histórico",
          "Condições",
        ].map((item, index) => (
          <button
            key={item}
            className={tab === index ? "active" : ""}
            onClick={() => setTab(index)}
          >
            {index === 0 ? (
              <Activity size={16} />
            ) : index === 1 ? (
              <Network size={16} />
            ) : index === 2 ? (
              <CirclePlay size={16} />
            ) : (
              <History size={16} />
            )}
            {item}
          </button>
        ))}
      </div>
      {tab !== 1 ? (
        <GenericDetail tab={tab} source={source} />
      ) : (
        <div className="operation-layout">
          <section className="operation-main">
            <div className="operation-toolbar">
              <div>
                <h2>Andamento do trabalho</h2>
                <p>Etapas agrupadas por fluxo.</p>
              </div>
              <div className="segmented">
                <button
                  className={view === "list" ? "active" : ""}
                  onClick={() => setView("list")}
                >
                  <List size={15} /> Lista
                </button>
                <button
                  className={view === "map" ? "active" : ""}
                  onClick={() => setView("map")}
                >
                  <Network size={15} /> Mapa
                </button>
              </div>
            </div>
            {view === "map" ? (
              <FlowCanvas
                flows={flows}
                dependencies={source.dependencies}
                onSelectStage={(stage) => setSelectedId(stage.id)}
              />
            ) : (
              <div className="operational-list">
                {flows.map((flow) => (
                  <div className="operational-flow" key={flow.id}>
                    <div className="operational-flow-head">
                      <span className="flow-symbol">
                        <Network size={17} />
                      </span>
                      <span>
                        <strong>{flow.name}</strong>
                        <small>{flow.description}</small>
                      </span>
                      <Badge tone="blue">
                        {
                          flow.stages.filter(
                            (stage) => stage.state === "Concluída",
                          ).length
                        }
                        /{flow.stages.length} concluídas
                      </Badge>
                    </div>
                    {flow.stages.map((stage, index) => (
                      <button
                        key={stage.id}
                        className={`operational-stage ${selectedId === stage.id ? "active" : ""}`}
                        onClick={() => setSelectedId(stage.id)}
                      >
                        <span className="step-number">
                          {stage.state === "Concluída" ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="stage-main">
                          <strong>{stage.name}</strong>
                          <small>{stage.description}</small>
                        </span>
                        <span className="stage-owner">
                          {stage.assigneeIds.slice(0, 2).map((id) => (
                            <i key={id} title={userName(id)}>
                              {userName(id)
                                .split(" ")
                                .map((part) => part[0])
                                .join("")
                                .slice(0, 2)}
                            </i>
                          ))}
                        </span>
                        <Badge tone={tone(stage.state)}>{stage.state}</Badge>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
          <aside className="execution-panel">
            {selected ? (
              <>
                <div className="execution-head">
                  <span className="eyebrow">ETAPA SELECIONADA</span>
                  <h2>{selected.name}</h2>
                  <Badge tone={tone(selected.state)}>{selected.state}</Badge>
                </div>
                <p>{selected.description}</p>
                <div className="execution-info">
                  <label>Responsáveis</label>
                  <strong>
                    {selected.assigneeIds.map(userName).join(", ") ||
                      "Não definidos"}
                  </strong>
                  <label>Dependências cadastradas</label>
                  <strong>
                    {source.dependencies.filter(
                      (dependency) => dependency.targetStageId === selected.id,
                    ).length || "Nenhuma"}
                  </strong>
                  <label>Execuções anteriores</label>
                  <strong>{selected.executions.length}</strong>
                </div>
                <div className="execution-actions">
                  {!actorId && (
                    <p className="field-help">
                      Selecione o operador no menu lateral.
                    </p>
                  )}
                  {selected.state === "Em andamento" && (
                    <label className="field">
                      Resultado
                      <input
                        className="input"
                        maxLength={100}
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                      />
                    </label>
                  )}
                  {selected.state === "Disponível" && (
                    <Button
                      disabled={mutationLoading || !actorId}
                      onClick={start}
                    >
                      <CirclePlay size={16} />{" "}
                      {mutationLoading ? "Iniciando..." : "Iniciar execução"}
                    </Button>
                  )}
                  {selected.state === "Em andamento" && (
                    <Button
                      disabled={mutationLoading || !actorId}
                      onClick={finish}
                    >
                      <CheckCircle2 size={16} />{" "}
                      {mutationLoading ? "Concluindo..." : "Concluir etapa"}
                    </Button>
                  )}
                  {selected.state === "Concluída" && (
                    <Button
                      disabled={mutationLoading || !actorId}
                      variant="secondary"
                      onClick={reopen}
                    >
                      <RotateCcw size={16} />{" "}
                      {mutationLoading ? "Reabrindo..." : "Reabrir etapa"}
                    </Button>
                  )}
                  <Button
                    disabled={mutationLoading}
                    variant="ghost"
                    onClick={() => setTab(4)}
                  >
                    Ver condições
                  </Button>
                </div>
                <div className="history-mini">
                  <Clock3 size={16} />
                  <span>
                    <strong>Histórico preservado</strong>
                    <small>
                      Novas execuções não substituem ciclos anteriores.
                    </small>
                  </span>
                </div>
              </>
            ) : (
              <p>Selecione uma etapa para ver os detalhes.</p>
            )}
          </aside>
        </div>
      )}
      {tab === 1 && selected && (
        <section
          style={{ marginTop: 24 }}
          aria-label={`Conversa da etapa ${selected.name}`}
        >
          <h2 style={{ marginBottom: 12 }}>Conversa · {selected.name}</h2>
          <EtapaMensagens
            etapaId={selected.id}
            usuarioAtualId={Number(actorId)}
            api={etapaMensagensApi}
          />
        </section>
      )}
    </>
  );
}

function GenericDetail({ tab, source }: { tab: number; source: Ticket }) {
  const { userName } = useDirectory();

  if (tab === 0)
    return (
      <div className="overview-grid">
        <section className="surface overview-main">
          <h2>Sobre este chamado</h2>
          <p>{source.description}</p>
          <dl>
            <div>
              <dt>Criador</dt>
              <dd>{userName(source.creatorId)}</dd>
            </div>
            <div>
              <dt>Responsáveis</dt>
              <dd>
                {source.assigneeIds.map(userName).join(", ") || "Não definidos"}
              </dd>
            </div>
          </dl>
        </section>
        <aside className="surface overview-aside">
          <h3>Progresso geral</h3>
          <strong>
            {
              source.flows
                .flatMap((flow) => flow.stages)
                .filter((stage) => stage.state === "Concluída").length
            }{" "}
            de {source.flows.flatMap((flow) => flow.stages).length}
          </strong>
          <p>etapas concluídas</p>
        </aside>
      </div>
    );
  if (tab === 4) return <ConditionRecords ticket={source} />;

  return (
    <ActivityRecords
      ticket={source}
      mode={tab === 2 ? "executions" : "history"}
    />
  );
}
