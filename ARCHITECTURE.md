# Arquitetura do Sistema - LocalTV

Este documento descreve a arquitetura atual do LocalTV, incluindo o modelo multi-cliente, persistencia de dados e fluxo entre Admin, API e Player.

## Visao Geral

O LocalTV roda como um backend Node.js/Express com SQLite e Socket.io, servindo uma SPA React/Vite.

- `backend/server.js`: API REST, uploads, arquivos estaticos e eventos em tempo real.
- `backend/database.js`: inicializacao e migracoes incrementais do schema SQLite.
- `frontend/src/admin`: painel administrativo.
- `frontend/src/player`: player de exibicao acessado em `/player/:deviceId`.

## Modelo Multi-Cliente

O sistema suporta multiplos clientes logicos.

- O cliente ativo e enviado pelo frontend no header `x-client-id`.
- `devices`, `media`, `playlists`, `playlist_items` e `templates` possuem `client_id`.
- O cliente `default` e criado automaticamente para compatibilidade com bases legadas.
- O admin pode alternar o cliente ativo sem mudar de instancia da aplicacao.

Esse isolamento vale para CRUD, listagens, uploads e relacoes entre entidades. O backend tambem impede vinculos cruzados, por exemplo template de um cliente em playlist ou overlay de outro.

## Persistencia e Arquivos

O backend usa `DATA_DIR` como raiz persistente.

- Banco SQLite: `DATA_DIR/data.db`
- Midias: `DATA_DIR/media/<client_id>/<tipo>/...`
- Compatibilidade antiga: `DATA_DIR/uploads/`

Tipos de midia atualmente roteados:

- `videos`
- `images`
- `html`
- `files`

Em desenvolvimento local, `DATA_DIR` cai por padrao na pasta `backend/`. Em container, o `Dockerfile` aponta `DATA_DIR=/data`.

## Fluxo de Tempo Real

Os players se conectam via Socket.io e entram em uma room por dispositivo.

Fluxo principal:

1. O player abre `/player/:deviceId`.
2. O frontend consulta o device, descobre seu `client_id` e passa a operar nesse escopo.
3. O player se registra via `register_device`.
4. O servidor envia `command_update`, `playlist:update` e `overlays_updated` conforme alteracoes administrativas.
5. Heartbeats atualizam `last_seen` e permitem marcar devices offline.

## Schema Principal

Tabelas centrais:

- `clients`: tenants logicos.
- `devices`: configuracao e status de cada tela.
- `media`: catalogo de arquivos fisicos.
- `playlists`: listas de reproducao por cliente.
- `playlist_items`: itens ordenados da playlist, podendo referenciar midia ou template.
- `templates`: layouts JSON reutilizaveis por cliente.
- `text_overlays`: overlays vinculados a device ou item de playlist.
- `device_playlists`: estrutura auxiliar para evolucao futura.

O schema e migrado de forma incremental no startup. Colunas novas sao adicionadas com `ALTER TABLE ... ADD COLUMN` quando necessario, e dados antigos recebem `client_id = 'default'`.

## Export e Import

`GET /api/config/export` exporta configuracao em JSON.

- Inclui `clients`, `devices`, `playlists`, `playlist_items`, `media`, `templates`, `text_overlays` e `device_playlists`.
- Nao exporta os binarios de midia, apenas registros.

`POST /api/config/import` reconstroi a configuracao a partir desse JSON.

## Deploy

O `Dockerfile` usa multi-stage build:

1. Build do frontend com Vite.
2. Runtime Node.js servindo API e frontend compilado.

Para producao:

- monte um volume em `/data`
- defina `ADMIN_PASSWORD`
- mantenha o healthcheck em `/health`

## Observacoes Operacionais

- O frontend admin depende do `localStorage` para lembrar o cliente ativo.
- O player descobre o `client_id` pelo device carregado.
- O isolamento por cliente hoje nao vale apenas como filtro visual; ele e aplicado no backend.
