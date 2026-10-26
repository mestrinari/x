# Mensagens por etapa

Integrado ao TicketWizard, nas abas Etapas e Mensagens. O componente usa o operador selecionado no diretório e os endpoints reais da API C#.

## Contrato

- GET /api/mensagens-etapas?etapaId=123: paginação com itens, total, pagina, tamanho.
- GET /api/mencoes-etapas?etapaId=123: destinatários das mensagens da etapa.
- GET /api/usuarios: nomes dos autores e sugestões; pesquisa local sem distinção de acentos.
- POST /api/mensagens-etapas: etapaId, usuarioId, conteudo, mensagemPaiId e mencoesUsuarioIds.
- PUT /api/mensagens-etapas/{id}: conteudo, versao e mencoesUsuarioIds.
- DELETE /api/mensagens-etapas/{id}: usuarioId e versao no corpo.

O adaptador usa src/api/http.ts e VITE_API_BASE_URL. A versão retornada pela API é obrigatória para editar/excluir. Mensagem e menções são salvas juntas pelo backend.

O banco armazena IDs dos destinatários, sem posições no texto. Menções existentes são preservadas na edição e podem ser removidas pelos chips. Não são inferidas posições a partir de nomes, que podem mudar ou se repetir.

## Tempo real

O cliente SignalR conecta a /api/hubs/etapas?etapaId=123. Eventos MensagensAlteradas atualizam a conversa; reconexões também recarregam os dados. A consulta periódica de 30 segundos cobre indisponibilidade do hub/backplane. Atualizações são adiadas enquanto o usuário edita para preservar o rascunho e detectar conflitos com a versão original.

Configure Redis no backend conforme REALTIME.md. Reinicie a API após compilar o hub. O proxy Vite está configurado com ws: true.

## Verificação

Execute npx tsc --noEmit, npm run build e node scripts/check-messages.mjs. O último verifica o contrato HTTP com respostas simuladas, sem gravar no banco.