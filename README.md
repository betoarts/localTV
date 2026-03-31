# 📺 LocalTV - Sistema de Sinalização Digital (Digital Signage)

**LocalTV** é uma aplicação full-stack para gerenciamento de terminais de exibição (TVs/Monitores). Permite controle centralizado de mídias, playlists, templates e overlays em tempo real, com suporte a multi-cliente.

---

## ✨ Funcionalidades Principais

- **📦 Biblioteca de Mídias (Ingestão):** Suporte para imagens e vídeos com upload direto via painel administrativo.
- **📜 Gerenciamento de Playlists:** Crie sequências de exibição personalizadas com ordem e duração ajustáveis.
- **🏢 Multi-Cliente:** Isolamento por `client_id` para dispositivos, mídias, playlists, itens e templates.
- **🖥️ Controle de Dispositivos:**
  - Gerencie múltiplos terminais simultaneamente.
  - Sincronização em tempo real via WebSockets (Socket.io).
  - Configuração de orientação (Vertical/Horizontal), resolução e transições.
- **✍️ Overlays de Texto Dinâmicos:**
  - Adicione barras de notícias (letreiros), avisos e logos sobre as mídias.
  - Animações variadas: Marquee (rolagem), Fade, Pulse, Typewriter, etc.
  - Posicionamento flexível na tela.
- **🛡️ Painel Administrativo:** Interface intuitiva protegida por senha para controle total da rede de telas.
- **💾 Backup & Portabilidade:** Exportação e importação completa de configurações em JSON.

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

### Instalação Manual (Windows)

Para facilitar, incluímos scripts de automação:

1.  Execute `install.bat` para instalar as dependências do Frontend e Backend.
2.  Execute `start.bat` para iniciar ambos os serviços simultaneamente.
3.  Acesse o Painel Administrativo em `http://localhost:3000/admin` (Senha padrão: `admin123`).

---

## 🛠️ Stack Tecnológica

- **Backend:** Node.js, Express, Socket.io (Tempo Real), SQLite (Persistência).
- **Frontend:** React, Vite, Tailwind CSS (Design Responsivo), Lucide React (Ícones).
- **Infra:** Docker, Easypanel (Opcional).

---

## 📁 Estrutura do Projeto

```bash
├── backend/            # API, Sockets e Banco de Dados (SQLite)
│   ├── database.js     # Schema e migrações incrementais
│   └── server.js       # Core do servidor
├── frontend/           # Aplicação React (Admin e Player)
│   ├── src/admin/      # Telas de gerenciamento
│   └── src/player/     # O "Motor" de exibição das TVs
├── Dockerfile          # Configuração de containerização
└── ARCHITECTURE.md     # Detalhes técnicos da arquitetura
```

---

## 🤝 Contribuição

Para desenvolvedores, consulte o arquivo [ARCHITECTURE.md](./ARCHITECTURE.md) para entender os fluxos de dados e eventos do sistema. Para detalhes de comunicação, veja [backend/API.md](./backend/API.md).

---
> Desenvolvido para transformar qualquer tela em um canal de comunicação inteligente.
