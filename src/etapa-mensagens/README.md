# Mensagens por etapa — React + TypeScript + MUI

## Arquivos

- `EtapaMensagens.tsx`: componente com histórico, respostas, edição, exclusão lógica e autocomplete de menções.
- `api.ts`: adaptador HTTP de exemplo, com endpoints ajustáveis à API C#.

## Dependências

```bash
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
```

## Utilização

```tsx
import EtapaMensagens from "./etapa-mensagens/EtapaMensagens";
import { etapaMensagensApi } from "./etapa-mensagens/api";

export function DetalheEtapa() {
  return <EtapaMensagens etapaId={15} usuarioAtualId={2} api={etapaMensagensApi} />;
}
```

## Contratos esperados da API C#

- `GET /api/etapas/{etapaId}/mensagens`: retorna array de `MensagemEtapa`, incluindo `mencoes` com intervalos atuais.
- `GET /api/usuarios?busca=ana`: retorna array de `{ id, nome, ativo }`.
- `POST /api/etapas/{etapaId}/mensagens`: recebe `{ conteudo, mensagemPaiId, mencoes }`.
- `PUT /api/mensagens/{mensagemId}`: recebe o mesmo formato.
- `DELETE /api/mensagens/{mensagemId}`: define `ExcluidoEm`, preservando o histórico.

Cada menção enviada tem `{ usuarioId, inicio, fim }`, com `inicio` inclusivo e `fim` exclusivo, medidos em índices UTF-16 de JavaScript. Por exemplo, `Olá @Ana Costa`, onde `@Ana Costa` ocupa `[4, 14)`. O backend deve validar que esse trecho inicia com `@`, corresponde ao usuário selecionado e que as menções pertencem à mensagem. Ao persistir na tabela atual de menções, grave `MensagemId` e `UsuarioId`; os offsets podem ser descartados, mas não poderão ser reconstruídos fielmente pelo endpoint GET sem armazená-los ou criar um contrato de representação de menções estável.

## Observações

- O banco discutido possui apenas `MensagemId` e `UsuarioId` em `ChamadoFluxoEtapaMensagemMencao`. Para restaurar corretamente as menções como seleção editável, recomenda-se acrescentar `Inicio` e `Fim` à tabela ou adotar tokens estruturados.
- A API deve identificar `UsuarioId` pelo usuário autenticado, sem confiar em IDs de autores enviados pelo navegador.
- Mensagens com resposta precisam pertencer à mesma etapa da mensagem original.
- O código inclui `window.confirm` para confirmação simples, substituível por `Dialog` do MUI.
- Adapte `BASE_URL`, autenticação e nomes de rotas ao backend efetivo.
