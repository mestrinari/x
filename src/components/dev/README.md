# DevTools integrado

Referência: `D:/Web/new/OG/src/components/dev`.

Os monitores de Network, Console, Erros, Performance, Timeline e Simulação foram reaproveitados. `ReferencePanels.tsx` extrai os painéis e helpers correspondentes do App original; `DevTools.tsx` integra o launcher ao Orbit. O CSS é renderizado no Shadow DOM. Zustand 4.5.7 foi declarado como dependência direta.

Abra o botão **DevTools PiP** no canto inferior direito. Todas as ferramentas abrem na mesma janela, com abas. Usa Document Picture-in-Picture quando disponível; caso contrário, tenta uma janela popup e, se bloqueada, exibe o painel na página. O estado e a captura continuam compartilhados com a aplicação principal.

- Network: captura de fetch, agrupamento por navegação, filtros, headers, query/payload, árvore JSON, status, duração, tamanhos, cURL/fetch/Axios, exportação JSON e edição/repetição explícita de chamadas.
- Console: níveis, busca, agrupamento, inspeção de valores, fixação, pausa e limpeza.
- Erros: JavaScript e promises, agrupamento por assinatura, stack, marcar conhecido, silenciar e associação textual a chamado.
- Simulador: envio manual de requisições e regras locais de rede, desativadas inicialmente.
- Performance: FPS, carga estimada da interface, latência HTTP e memória quando disponível.
- Timeline: eventos locais de interação/rede/erros, com pausa e limpeza.

O runtime inicia em `src/main.tsx` e não depende do antigo login/backend QA. Não foram importados os módulos de negócios antigos (chamados, Quartz, relatórios, flags remotas, editor de layout e testes QA), nem o mecanismo que substituía a próxima resposta da aplicação após um replay. Repetir uma chamada mostra seu resultado, sem forçar atualização da tela de origem.

Limites: captura HTTP via fetch (não intercepta XHR, frames WebSocket ou recursos carregados pelo navegador); até 500 registros, prévia de resposta até 256 KB e strings até 50 mil caracteres. Binários e streaming não têm prévia. Tamanho de resposta pode refletir a prévia quando não há leitura integral. Dados de rede sensíveis são ocultados; registros permanecem na memória da aba. Regras do simulador são salvas no armazenamento local. Repetições usam o payload disponível na prévia: campos ocultos/truncados devem ser preenchidos novamente para reprodução fiel.

Validações: `node scripts/check-devtools.mjs`, build Vite e verificação visual do Network no navegador. TypeScript foi verificado com `--ignoreDeprecations 5.0 --noUnusedLocals false --noUnusedParameters false` devido às pendências existentes na configuração/projeto.
