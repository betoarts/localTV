# Referencia da API e Sockets - LocalTV

Este documento descreve a API REST e os eventos Socket.io atualmente expostos pelo backend.

## Convencoes

- Base HTTP: `/api`
- Healthcheck: `/health`
- Escopo multi-cliente: header `x-client-id`
- Fallback para bases antigas: cliente `default`

Sem `x-client-id`, a API opera no cliente `default`.

## Autenticacao

### `POST /api/auth/login`

Body:

```json
{ "password": "admin123" }
```

Resposta:

```json
{ "success": true, "token": "fake-jwt-token-for-now" }
```

## Health e Metricas

### `GET /health`

Retorna status simples do processo e do banco.

### `GET /api/metrics/clients`

Resumo agregado por cliente para dashboard administrativo.

### `GET /api/metrics/clients/summary?since_minutes=60`

Resumo de atividade recente por janela de tempo.

## Clients

### `GET /api/clients`

Lista clientes.

### `POST /api/clients`

Cria cliente.

```json
{ "id": "tenant-a", "name": "Tenant A" }
```

### `PUT /api/clients/:id`

Renomeia cliente.

### `DELETE /api/clients/:id`

Remove cliente sem dados associados. O backend bloqueia exclusao quando ha `devices`, `playlists` ou `media`.

## Media

### `GET /api/media`

Lista midias do cliente ativo.

### `POST /api/media/upload`

Upload multipart com campo `file`.

Resposta inclui `client_id` e `path`, por exemplo:

```json
{
  "id": 10,
  "filename": "1774805865219.jpg",
  "type": "image",
  "originalname": "sample.jpg",
  "path": "/media/tenant-a/images/1774805865219.jpg",
  "client_id": "tenant-a"
}
```

### `DELETE /api/media/:id`

Remove o registro e tenta excluir o arquivo fisico do cliente.

## Playlists

### `GET /api/playlists`

Lista playlists do cliente ativo.

### `POST /api/playlists`

Cria playlist no cliente ativo.

### `PUT /api/playlists/:id`

Atualiza nome da playlist.

### `DELETE /api/playlists/:id`

Remove playlist, itens e desvinculos do cliente.

### `GET /api/playlists/:id/items`

Lista itens da playlist com joins de midia e template.

### `POST /api/playlists/:id/items`

Adiciona item na playlist.

Body aceito:

```json
{
  "media_id": 1,
  "template_id": null,
  "duration": 10,
  "data_json": null
}
```

`template_id`, quando informado, precisa pertencer ao mesmo cliente.

### `PUT /api/playlists/:playId/items/:itemId`

Atualiza duracao e `data_json` do item.

### `DELETE /api/playlists/:playId/items/:itemId`

Remove item.

### `PUT /api/playlists/:id/items/reorder`

Reordena itens.

```json
{ "items": [4, 2, 3] }
```

## Devices

### `GET /api/devices`

Lista devices do cliente ativo.

### `POST /api/devices`

Cria device.

### `PUT /api/devices/:id`

Atualiza configuracao do device.

### `GET /api/devices/:id`

Consulta device individual. Pode receber `?client_id=...` para validacao explicita no player.

### `DELETE /api/devices/:id`

Remove device do cliente.

## Templates

### `GET /api/templates`

Lista templates do cliente ativo.

### `POST /api/templates`

Cria template no cliente ativo.

### `PUT /api/templates/:id`

Atualiza template do cliente ativo.

### `DELETE /api/templates/:id`

Remove template do cliente ativo.

## Overlays

### `GET /api/overlays`

Lista overlays ativos/inativos visiveis para o cliente.

### `GET /api/overlays/target/:type/:id`

Lista overlays ativos para um alvo especifico.

### `GET /api/overlays/playlist-items/:id`

Lista overlays ativos dos itens de uma playlist.

### `POST /api/overlays/upload-image`

Upload multipart com campo `image`. O arquivo vai para a pasta de imagens do cliente ativo.

### `POST /api/overlays`

Cria overlay. `target_id` deve pertencer ao cliente ativo. `template_id`, quando presente, tambem.

### `PUT /api/overlays/:id`

Atualiza overlay existente.

### `DELETE /api/overlays/:id`

Remove overlay.

## Configuracao

### `GET /api/config/export`

Exporta configuracao em JSON.

Inclui:

- `clients`
- `devices`
- `playlists`
- `playlist_items`
- `media`
- `templates`
- `text_overlays`
- `device_playlists`

### `POST /api/config/import`

Importa configuracao a partir do JSON exportado. Os binarios de midia nao sao reimportados por esse endpoint.

## Eventos Socket.io

### Cliente para servidor

- `register_device`
- `register`
- `heartbeat`
- `now_playing`
- `request_dashboard`

### Servidor para cliente

- `devices_updated`
- `playlist_updated`
- `playlist:update`
- `overlays_updated`
- `command_update`
- `dashboard_update`
