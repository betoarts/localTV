# 🛠️ Referência da API e Sockets - LocalTV

Este documento detalha os endpoints REST e os eventos de Socket.io utilizados para comunicação entre o Admin, o Servidor e os Players.

---

## 🔐 Autenticação

- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ "password": "..." }`
- **Resposta:** JWT falso (por enquanto) ou erro 401.

---

## 📂 Endpoints REST (`/api`)

### Mídias
- `GET /media`: Lista todos os arquivos ingeridos.
- `POST /media/upload`: Upload de novo arquivo (Multipart).
- `DELETE /media/:id`: Remove o registro e o arquivo físico.

### Playlists
- `GET /playlists`: Lista todas as playlists.
- `GET /playlists/:id/items`: Retorna as mídias de uma playlist específica.
- `POST /playlists`: Cria nova playlist.
- `PUT /playlists/:id`: Renomeia playlist.
- `DELETE /playlists/:id`: Remove playlist e desvincula de dispositivos.
- `POST /playlists/:id/items`: Adiciona item à playlist.
- `PUT /playlists/:id/items/reorder`: Reordena itens (envia array de IDs).

### Dispositivos
- `GET /devices`: Lista terminais e status.
- `POST /devices`: Registra novo terminal.
- `PUT /devices/:id`: Atualiza configurações (orientação, resolução, etc).
- `DELETE /devices/:id`: Remove terminal.

### Overlays (Camadas)
- `GET /overlays`: Lista todos os overlays.
- `POST /overlays`: Cria novo overlay.
- `PUT /overlays/:id`: Atualiza overlay.
- `DELETE /overlays/:id`: Remove overlay.

---

## 📡 Eventos Socket.io

O sistema utiliza WebSockets para atualizações em tempo real sem a necessidade de refresh.

### Servidor para Cliente (Emit)
- `devices_updated`: Notifica o Admin que um dispositivo mudou de status ou configuração.
- `playlist_updated (id)`: Notifica os Players que a playlist atual foi alterada.
- `overlays_updated`: Notifica novos overlays ativos.
- `command_update (data)`: Enviado para a sala de um dispositivo específico com novas instruções.
- `dashboard_update`: Envia dados de reprodução em tempo real para o Admin.

### Cliente para Servidor (Listen)
- `register_device (deviceId)`: O Player se identifica ao conectar.
- `now_playing (data)`: O Player reporta o que está exibindo no momento.
- `request_dashboard`: O Admin solicita o status atual de todas as telas.

---

## 💾 Configuração (Backup)

- `GET /api/config/export`: Gera um JSON com todo o banco de dados (exceto arquivos binários).
- `POST /api/config/import`: Sobrescreve a configuração atual com um arquivo JSON fornecido.

---
