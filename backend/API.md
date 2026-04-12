# Referência da API e Sockets - LocalTV

Este documento descreve a API REST e os eventos Socket.io atualmente expostos pelo backend.

---

## Convenções

- **Base HTTP:** `/api`
- **Healthcheck:** `/health`
- **Multi-Tenant:** Header `x-client-id`
- **Fallback:** Cliente `default`

---

## 🔐 Autenticação

### `POST /api/auth/login`
Autentica o acesso ao painel administrativo.
- **Body:** `{ "password": "admin123" }`
- **Resposta:** `{ "success": true, "token": "v0_token" }`

---

## 📊 Saúde e Métricas

### `GET /health`
Verifica se o servidor e o banco SQLite estão operacionais.

### `GET /api/metrics/clients`
Resumo quantitativo por cliente (devices online, total de mídias, etc).

### `GET /api/metrics/clients/summary?since_minutes=60`
Atividade de devices vistos recentemente em uma janela de tempo específica.

---

## 🏙️ Clima (Weather)

### `GET /api/weather?city=Canela,RS`
Proxy para Open-Meteo com geocoding automático e cache de 10 min.
- **Parâmetros:** `city` (ex: "São Paulo" ou "Gramado,RS").
- **Resposta:**
```json
{
  "city": "Canela",
  "temperature": 22,
  "feelsLike": 24,
  "humidity": 65,
  "windSpeed": 10,
  "weatherCode": 0,
  "updatedAt": "2024-03-31T..."
}
```

---

## 🤖 Assistente AI

### `POST /api/chat`
Envia uma pergunta ao assistente.

- **Body:**
```json
{
  "message": "Meu nome e Carlos e moro em Canela",
  "provider": "groq"
}
```

Notas:

- O campo `provider` e opcional no frontend standalone; o backend aplica fallback automatico.
- O backend usa:
  - `systemPrompt`
  - historico curto persistido
  - fatos persistidos por `client_id`
- Provedores suportados atualmente:
  - `gemma`
  - `gemini`
  - `groq`
  - `openai`

### `GET /api/chat/status`
Retorna os provedores disponiveis e o fallback configurado.

### `GET /api/chat/memory`
Retorna a memoria do assistente para o `client_id` ativo.

- **Resposta:**
```json
{
  "client_id": "default",
  "count": 4,
  "items": [
    { "role": "user", "content": "Meu nome e Carlos" },
    { "role": "assistant", "content": "Prazer, Carlos." }
  ],
  "facts_count": 2,
  "facts": [
    { "fact_key": "name", "fact_value": "Carlos" },
    { "fact_key": "city", "fact_value": "Canela" }
  ]
}
```

### `DELETE /api/chat/memory`
Apaga toda a memoria do assistente para o `client_id` ativo.

- Remove:
  - historico curto
  - fatos persistidos

---

## 🖥️ Devices (Dispositivos)

### `GET /api/devices`
Lista dispositivos do cliente ativo.

### `POST /api/devices`
Cria um novo terminal.
- **Body:**
```json
{
  "name": "TV Recepção",
  "orientation": "landscape",
  "resolution": "1080p", 
  "transition": "fade",
  "muted": 1,
  "is_playing": 1
}
```
*Resoluções suportadas: `auto`, `720p`, `1080p`, `4k`.*

### `PUT /api/devices/:id`
Altera configurações. Dispara `command_update` e `playlist:update` via Socket para o dispositivo físico.

---

## ✍️ Overlays (Camadas de Texto e Mídia)

### `POST /api/overlays`
Cria uma camada sobreposta para um dispositivo ou item de playlist.
- **Body estendido:**
```json
{
  "text": "Bem-vindo!",
  "target_type": "device",
  "pos_x": 50, "pos_y": 90,
  "font_family": "Inter",
  "icon_name": "Cloud",
  "image_path": "/media/default/images/logo.png",
  "animation": "marquee"
}
```

### `POST /api/overlays/upload-image`
Upload de imagem para uso em overlays. Retorna o `path` para ser usado no POST acima.

---

## 💾 Configuração (Backup)

### `GET /api/config/export`
Faz o download de um arquivo JSON contendo toda a base de dados lógica (clients, devices, playlists, media records, overlays).

### `POST /api/config/import`
Importa um arquivo JSON exportado anteriormente. **Atenção:** Este processo limpa as tabelas existentes e as substitui pelos dados do arquivo.

---

## 🔌 Eventos Socket.io

### Cliente -> Servidor
- `register_device`: Inicia a sessão da TV.
- `heartbeat`: Mantém o status `online`.
- `now_playing`: Informa a mídia atual para o dashboard (Live Preview).

### Servidor -> Cliente
- `playlist:update`: Envia a nova lista de reprodução formatada.
- `command_update`: Atualiza resolução, transição, volume e status do player.
- `overlays_updated`: Força o recarregamento dos overlays na tela.
- `dashboard_update`: Notifica o admin sobre o que está passando em cada TV.
