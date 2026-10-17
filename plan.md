# Integração concluída com os endpoints disponíveis

A implementação e os limites do contrato estão descritos em [API-INTEGRATION.md](./API-INTEGRATION.md).

A comunicação local usa o proxy do Vite para http://localhost:5081. As telas consultam dados reais; o assistente mantém IDs/versões retornados durante gravações parciais, e os conflitos são apresentados ao usuário. O backend não oferece transação do agregado, restauração ou motor automático de workflows.
