# 📺 LocalTV - Sistema de Sinalização Digital (Digital Signage)

**LocalTV** é uma aplicação full-stack para gerenciamento de terminais de exibição (TVs/Monitores). Permite controle centralizado de mídias, playlists, templates e overlays em tempo real, com suporte a multi-cliente.

---

## ✨ Funcionalidades Principais

- **📦 Biblioteca de Mídias (Ingestão):** Suporte para imagens e vídeos com upload direto via painel administrativo.
- **📜 Gerenciamento de Playlists:** Crie sequências de exibição personalizadas com ordem e duração ajustáveis.
- **🏢 Multi-Cliente:** Isolamento por `client_id` para dispositivos, mídias, playlists, itens e templates (Tenancy).
- **🖥️ Controle de Dispositivos:**
  - Gerencie múltiplos terminais simultaneamente.
  - Sincronização em tempo real via WebSockets (Socket.io).
  - Configuração de orientação (Vertical/Horizontal), resolução (720p, 1080p, 4K) e transições.
- **🌤️ Widget de Clima Dinâmico:** Integração nativa com a API Open-Meteo para exibir clima em tempo real nas telas baseado na cidade informada.
- **🤖 Assistente com Texto, Voz e Memória:** A rota `/assistant` aceita texto e microfone, responde com texto e áudio, e mantém memória persistente por `client_id`.
- **✍️ Overlays de Texto & Mídia Dinâmicos:**
  - Adicione letreiros, avisos, logos e ícones sobre as mídias.
  - Animações variadas e posicionamento preciso (coordenadas X/Y).
- **💾 Backup & Portabilidade:** Exportação e importação completa de toda a configuração do sistema em arquivos JSON.
- **🛡️ Painel Administrativo:** Interface intuitiva e responsiva (Mobile/Desktop) protegida por senha para controle total da rede.
- **⚡ Performance Otimizada:** Banco de dados indexado e preloading inteligente de mídias no player.

---

## 🚀 Início Rápido (Quick Start)

### Via Docker (Recomendado)

O LocalTV já vem preparado para rodar em containers, facilitando a implantação:

1.  Certifique-se de ter o Docker instalado.
2.  Na raiz do projeto, execute:
    ```bash
    docker build -t localtv .
    docker run -p 3000:3000 -e ADMIN_PASSWORD=troque-esta-senha -v localtv_data:/data localtv
    ```
3.  Acesse `http://localhost:3000`.

Para producao, o volume em `/data` e obrigatorio para persistir `data.db` e arquivos de midia.
Para usar microfone no assistente fora de `localhost`, publique a aplicacao em `HTTPS`.

### Instalação Manual (Windows)

Para facilitar, incluímos scripts de automação:

1.  Execute `install.bat` para instalar as dependências do Frontend e Backend.
2.  Execute `start.bat` para iniciar ambos os serviços simultaneamente.
3.  Acesse o Painel Administrativo em `http://localhost:3000/admin` (Senha padrão: `admin123`).
4.  Acesse o assistente em `http://localhost:5173/assistant` durante desenvolvimento.

## 🧠 Assistente AI

O projeto possui duas interfaces de assistente:

- **`/assistant`:** tela standalone para tablet/quiosque.
- **Overlay do player:** assistente flutuante opcional sobre a tela principal.

Recursos atuais:

- envio por texto
- resposta com fala usando `speechSynthesis`
- entrada por microfone com modo `pressione para falar`
- fallback automatico de provedores no backend
- memoria persistente por `client_id`
- limpeza de memoria pelo proprio assistente
- painel admin para configurar o assistente e inspecionar a memoria

### Rotas e telas relacionadas

- **Assistente standalone:** `/assistant`
- **Configuração do assistente:** `/admin/assistant-config`
- **Memória do assistente:** `/admin/assistant-memory`

### Microfone

- Em desenvolvimento, o microfone funciona em `localhost`.
- Em tablet/outro dispositivo na rede, prefira publicar em `HTTPS`.
- O recurso pode ser ativado ou desativado no painel admin.

### Memória

A memória V3 possui duas camadas:

- **Histórico curto:** últimas mensagens da conversa.
- **Fatos persistidos:** informações semânticas simples, como nome, cidade e preferências, extraídas da conversa.

Tudo é isolado por `client_id`.

## ☁️ EasyPanel

O projeto pode ser implantado via `Dockerfile` no EasyPanel.

Recomendações:

- monte volume persistente em `/data`
- publique com domínio e SSL para habilitar microfone fora de `localhost`
- use `DATA_DIR=/data`
- use `ADMIN_PASSWORD` e chaves de IA por variáveis de ambiente

---

## 🛠️ Stack Tecnológica

- **Backend:** Node.js, Express, Socket.io (Tempo Real), SQLite (Persistência).
- **Frontend:** React, Vite, Tailwind CSS (Design Responsivo), Lucide React (Ícones), Web Speech API.
- **Infra:** Docker, Easypanel (Opcional).

---

## 📁 Estrutura do Projeto

```bash
├── backend/            # API, Sockets e Banco de Dados (SQLite)
│   ├── database.js     # Schema e migrações incrementais
│   └── server.js       # Core do servidor
├── frontend/           # Aplicação React (Admin e Player)
│   ├── src/admin/      # Telas de gerenciamento
│   ├── src/hooks/      # Hooks reutilizáveis (ex: voz)
│   └── src/player/     # O "Motor" de exibição das TVs e assistente
├── Dockerfile          # Configuração de containerização
└── ARCHITECTURE.md     # Detalhes técnicos da arquitetura
```

---

## 🤝 Contribuição

Para desenvolvedores, consulte o arquivo [ARCHITECTURE.md](./ARCHITECTURE.md) para entender os fluxos de dados e eventos do sistema. Para detalhes de comunicação, veja [backend/API.md](./backend/API.md).

---
> Desenvolvido para transformar qualquer tela em um canal de comunicação inteligente.
