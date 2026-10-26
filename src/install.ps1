$ErrorActionPreference='Stop'
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'Node/npm nao encontrado.' }
npm install @microsoft/signalr
if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar @microsoft/signalr.' }
Write-Host 'Copie src/notifications/ para o projeto React e integre no provedor de autenticacao.'
