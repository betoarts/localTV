# 🏛️ Arquitetura do Sistema - LocalTV

Este documento descreve a estrutura técnica, o fluxo de dados e os princípios de design do LocalTV.

---

## 🏗️ Visão Geral da Pilha (Tech Stack)

O LocalTV utiliza uma arquitetura Monolítica Desacoplada:
- **Backend (Node.js/Express):** Atua como o cérebro, gerenciando a persistência, o sistema de arquivos e a sinalização em tempo real.
- **Frontend (React/Vite):** Uma aplicação única (SPA) que serve tanto para o **Painel Administrativo** quanto para o **Player de Exibição**.
- **Comunicação:**
  - **REST API:** Para operações CRUD (Criar, Ler, Atualizar, Deletar) de configurações.
  - **WebSockets (Socket.io):** Para controle instantâneo das TVs (ex: trocar playlist agora, atualizar overlay).

---

## 📡 Fluxo de Comunicação em Tempo Real

A arquitetura de rede segue o padrão **Pub/Sub** assistido pelo servidor:

1.  **Registro:** Cada Player (TV) se conecta via Socket.io e se registra em uma "sala" (room) baseada no seu `ID`.
2.  **Monitoramento:** O servidor monitora o status `online`/`offline` e a mídia que está sendo reproduzida no momento (`now_playing`).
3.  **Comandos:** Quando um administrador altera uma configuração (ex: muda a orientação da tela), o servidor envia um evento `command_update` apenas para a sala daquele dispositivo específico.
4.  **Broadcast:** Alterações globais (como novos uploads de mídia) são enviadas via broadcast para manter todos os painéis administrativos sincronizados.

---

## 🗄️ Modelo de Dados (Schema)

O banco de dados é **SQLite**, escolhido pela simplicidade e facilidade de backup (um único arquivo `data.db`).

### Principais Tabelas:
- `devices`: Armazena configurações físicas (resolução, orientação) e o link para a playlist ativa.
- `media`: Registro dos arquivos físicos no diretório `uploads/`.
- `playlists` & `playlist_items`: Define a sequência e o tempo de exibição de cada mídia.
- `text_overlays`: Regras de exibição de camadas extras de informação (texto/logo) sobre o conteúdo principal.

---

## 🎨 O Motor de Overlays (Overlay Engine)

Localizado em `frontend/src/player/TextOverlayRenderer.jsx`, este motor é responsável por:
- **Posicionamento:** Usa classes CSS dinâmicas para fixar elementos em 9 pontos estratégicos da tela.
- **Animações:** Implementa Keyframes CSS para efeitos de *Marquee*, *Fade*, *Typewriter*, etc.
- **Blur & Glassmorphism:** Utiliza `backdrop-filter` para garantir legibilidade de texto sobre qualquer vídeo ou imagem.

---

## 📦 Containerização

O `Dockerfile` utiliza um processo de **Multi-stage Build**:
1.  **Build Stage:** Compila o código React para arquivos estáticos otimizados.
2.  **Production Stage:** Configura um servidor Node.js leve que serve tanto a API quanto os arquivos estáticos do frontend, minimizando o tamanho final da imagem.

---
