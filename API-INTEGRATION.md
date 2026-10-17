# Integração local

O front usa URLs relativas `/api/...`. O Vite encaminha essas chamadas para
`http://localhost:5081`, porta HTTP do perfil local da API. Isso elimina a chamada
entre origens no navegador e a dependência do certificado de `https://localhost:7292`.
O proxy está habilitado em desenvolvimento e em `vite preview`.

Variáveis opcionais em `.env.local`:

```dotenv
VITE_API_BASE_URL=
API_PROXY_TARGET=http://localhost:5081
VITE_API_TIMEOUT_MS=15000
```

Reinicie o Vite ao mudar variáveis. Em hospedagem estática, configure o servidor
para encaminhar `/api` ao backend; o proxy do Vite não faz parte do bundle.
Uma URL absoluta em `VITE_API_BASE_URL` volta a exigir CORS e certificado válidos
no backend. Não foi habilitado CORS irrestrito nem desabilitada validação TLS.

## Telas e persistência

- Dashboard, chamados, meus chamados, usuários, tipos, fluxos, históricos e detalhe
  consultam a API. Falhas não são substituídas por dados fictícios.
- Criação/edição grava chamado, fluxos, etapas, responsáveis e dependências.
- Cada PUT/DELETE utiliza o ROWVERSION carregado; conflitos 409 são exibidos.
- O assistente guarda IDs e versões após cada resposta. Após falha parcial, tentar
  novamente na mesma tela reutiliza os registros já salvos. A API não oferece uma
  transação para o agregado inteiro: não recarregue a página durante o salvamento.
- Exclusão de fluxos/etapas/dependências é lógica; a opção Restaurar desfaz somente
  a marcação local antes de salvar. A API não possui endpoint de restauração.
- Listagens percorrem todas as páginas. Dependências do detalhe são limitadas às
  etapas do chamado e carregam os IDs dos fluxos para desenhar conexões cruzadas.
- Concluir execução preserva início, autor e outros campos do PUT completo.
  Reabrir cria uma execução nova vinculada à anterior. O detalhe envia eventos
  de início/conclusão/reabertura ao endpoint de histórico.
- A edição de etapas permite alterar nome, descrição, ordem visual, status
  administrativo, estado operacional, responsáveis, convergência, conclusão manual
  e execuções simultâneas. Os oito estados operacionais são persistidos usando a
  execução e um evento `ESTADO_OPERACIONAL_ALTERADO`, vinculado à versão dessa
  execução. O evento distingue estados que compartilham um código da API. Uma
  alteração posterior da execução invalida essa sobreposição de apresentação.
  Alterar uma execução já finalizada cria um novo ciclo, preservando o anterior.
- O operador selecionado é um ID explícito de usuário, não uma autenticação.
  Usuários e tipos são criados/editados pelos respectivos formulários.

## Limites do contrato existente

Conforme `Chamados/API.md` no backend, os status são números sem enum semântico
normativo. Os rótulos de status do chamado mantêm a convenção do front anterior:
0 Rascunho, 1 Aberto, 2 Em andamento, 3 Aguardando, 4 Concluído. Os códigos e campos
originais são preservados ao editar campos não relacionados. Essa convenção deve
ser alinhada com outros clientes que escrevam no mesmo banco.

Prioridade, categoria, solicitante separado, observações e vários responsáveis
gerais não têm campos na API atual; não são oferecidos como campos persistentes.
Etapas aceitam vários responsáveis.

A API não é um motor de workflow: não avalia regras, não inicia etapas sucessoras
e não registra transições automaticamente. A aba Condições consulta avaliações
e transições existentes; não simula reavaliações. Arrastar nós organiza apenas a
visualização atual, pois não há campo de posição no contrato.

## Verificação

```powershell
npx tsc --noEmit
npm run build
$env:RUN_LOCAL_API_CHECK='1'
node scripts/check-local-api.mjs
```

O último comando usa a API local e um usuário ativo existente como autor de uma
fixture identificada por `[TESTE INTEGRAÇÃO]`. Testa paginação, salvamento parcial
e retomada, versão conflitante, vínculos e execuções. Exclui logicamente a fixture
ao final; os registros de execução permanecem vinculados às etapas excluídas,
pois o contrato não permite apagar execuções.
