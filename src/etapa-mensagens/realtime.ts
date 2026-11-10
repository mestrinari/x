import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { apiConfig } from "../api/config";
import type { ApiId } from "../api/types";

export function observarMensagens(etapaId: ApiId, atualizar: () => void, status: (conectado: boolean) => void) {
  const hubUrl = `${apiConfig.baseUrl}/api/hubs/etapas?etapaId=${encodeURIComponent(etapaId)}`;
  const connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => localStorage.getItem("token") ?? "",
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .configureLogging(LogLevel.Error)
    .build();
  let encerrado = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const conectado = () => { if (!encerrado) { status(true); atualizar(); } };
  const agendar = () => {
    if (encerrado || retry) return;
    status(false);
    retry = setTimeout(() => { retry = undefined; void iniciar(); }, 5000);
  };

  async function iniciar() {
    try {
      await connection.start();
      if (encerrado) { await connection.stop(); return; }
      conectado();
    } catch { agendar(); }
  }

  connection.on("MensagensAlteradas", () => { if (!encerrado) atualizar(); });
  connection.onreconnecting(() => { if (!encerrado) status(false); });
  connection.onreconnected(conectado);
  connection.onclose(agendar);
  void iniciar();

  return () => {
    encerrado = true;
    clearTimeout(retry);
    void connection.stop().catch(() => {});
  };
}

