# Arquitetura do Sistema - LocalTV

Este documento descreve a arquitetura do LocalTV, incluindo o modelo multi-cliente, persistência de dados e fluxos entre Admin, API e Player.

## Visão Geral

O LocalTV roda como um backend Node.js/Express com SQLite e Socket.io, servindo uma SPA React/Vite.

- `backend/server.js`: API REST, uploads, arquivos estáticos, eventos em tempo real e integração de clima.
- `backend/database.js`: Inicialização e migrações incrementais do schema SQLite, com otimizações de performance.
- `frontend/src/admin`: Painel administrativo (Dashboard responsivo).
- `frontend/src/player`: Engine de exibição (Player), overlay do assistente e tela `/assistant`.
- `frontend/src/hooks/useSpeechRecognition.js`: Integração de reconhecimento de voz no navegador.

## Modelo Multi-Cliente (Tenancy)

O sistema suporta múltiplos clientes lógicos em uma única instância.

- **Identificação:** O cliente ativo é enviado pelo frontend no header `x-client-id`.
- **Isolamento:** Entidades como `devices`, `media`, `playlists` e `templates` possuem `client_id`.
- **Compatibilidade:** O cliente `default` é usado para bases legadas.
- **Segurança:** O backend valida se os recursos vinculados (ex: template em playlist) pertencem ao mesmo `client_id`.

## Fluxo de Tempo Real (Socket.io)

Os players se conectam e entram em rooms específicas (`device_{id}`).

1. **Registro:** O player envia `register_device`. O servidor atualiza o status para `online`.
2. **Updates:** Alterações no Admin disparam `command_update` (ajustes de tela) ou `playlist:update`.
3. **Monitoring:** Heartbeats mantêm a conexão ativa. Dispositivos sem sinal por >90s são marcados como `offline`.
4. **Dashboard:** O evento `now_playing` permite que o Admin visualize o que cada tela está exibindo em tempo real.

## Funcionalidades Técnicas Avançadas

### 🤖 Assistente AI, Voz e Memória

O assistente opera em duas superfícies:

- rota standalone `/assistant`
- overlay flutuante opcional no player

Fluxo atual:

1. O frontend envia a mensagem para `POST /api/chat`.
2. O backend recupera o `systemPrompt`, histórico curto e fatos persistidos por `client_id`.
3. O backend tenta os provedores em fallback (`gemma`, `gemini`, `openai`).
4. O frontend renderiza a resposta e faz TTS com `speechSynthesis`.
5. Quando habilitado, a entrada por voz usa Web Speech API no navegador.

#### Reconhecimento de Voz (Speech Recognition)

A entrada por voz é implementada no frontend usando a **Web Speech API**:

**Componentes:**

| Arquivo | Responsabilidade |
|---------|------------------|
| `frontend/src/hooks/useSpeechRecognition.js` | Hook React que gerencia o ciclo de vida do reconhecimento |
| `frontend/src/player/AssistantPage.jsx` | Interface do usuário com botão de microfone |
| `backend/routes/settingsRoutes.js` | Configuração `enableVoice` no banco |

**Fluxo de Reconhecimento:**

1. Usuário clica no botão de microfone
2. `useSpeechRecognition` verifica:
   - `window.SpeechRecognition` ou `window.webkitSpeechRecognition` disponíveis
   - Contexto seguro (`localhost` ou `HTTPS`)
   - `enableVoice` habilitado na configuração
3. Inicia captura de áudio com `recognition.start()`
4. Eventos:
   - `onstart`: Define estado `listening = true`
   - `onresult`: Processa resultados interim e final
   - `onend`: Define estado `listening = false`
   - `onerror`: Trata erros (permissão negada, sem fala, etc.)
5. Resultado final é enviado automaticamente via `POST /api/chat`

**Tratamento de Erros:**

```javascript
// Erros comuns tratados:
- 'not-allowed': Permissão do microfone negada
- 'no-speech': Nenhuma fala detectada
- 'audio-capture': Microfone não acessível
- 'network': Falha na rede de reconhecimento
- 'language-not-supported': pt-BR não disponível
```

**Debug Logging:**

O hook inclui logs de console para diagnóstico:

```javascript
console.log('[SpeechRecognition] Checking support...', { ... })
console.log('[SpeechRecognition] Created instance:', recognition)
console.log('[SpeechRecognition] Result:', { text, isFinal })
console.error('[SpeechRecognition] Error:', event.error)
```

**Configuração:**

A configuração `enableVoice` é armazenada em `app_settings`:

```sql
SELECT value FROM app_settings WHERE key = 'ai_config';
-- Retorna: {"enableVoice": true, ...}
```

Para alterar via painel admin, acesse `/admin/ai-assistant-config`.

**Requisitos de Navegador:**

| Navegador | Suporte |
|-----------|---------|
| Chrome/Edge | ✅ Completo (webkitSpeechRecognition) |
| Firefox | ❌ Não implementado |
| Safari | ❌ Não implementado |

Memória V3:

- **`assistant_memory`:** histórico curto persistido.
- **`assistant_facts`:** fatos semânticos persistidos, extraídos por padrões simples.
- **Limpeza:** `DELETE /api/chat/memory` remove histórico e fatos do `client_id` ativo.

### 🌤️ Weather API Flow
A integração de clima evita a necessidade de chaves de API no frontend e implementa cache:
1. **Geocoding:** O backend consulta a `Open-Meteo Geocoding API` para converter o nome da cidade em coordenadas.
2. **Forecast:** As coordenadas são usadas na `Open-Meteo Forecast API`.
3. **Cache:** Resultados são cacheados por 10 minutos para evitar rate-limiting e acelerar o carregamento dos players.

### ✍️ Engine de Overlays
Os overlays evoluíram de simples textos para camadas ricas de mídia:
- **Posicionamento:** Uso de coordenadas `pos_x` e `pos_y` (0-100) para posicionamento absoluto.
- **Mídia:** Suporte a ícones (Lucide) e imagens customizadas sobrepostas.
- **Templates:** Overlays podem referenciar layouts JSON complexos definidos na tabela `templates`.

### 💾 Portabilidade & Backup
O sistema permite migração completa entre servidores via JSON:
- **Exportação:** Reúne registros de todas as tabelas (exceto binários físicos).
- **Importação:** Executa um `DELETE/INSERT` atômico dentro de uma transação SQL para garantir a integridade da nova configuração.

## Persistência e Performance

### Banco de Dados
O SQLite utiliza índices estratégicos para garantir fluidez mesmo com grandes volumes de mídia:
- `idx_devices_client`, `idx_media_client`, etc: Aceleram o filtro por cliente.
- `idx_playlist_items_order`: Otimiza a renderização da sequência de reprodução.
- `idx_assistant_memory_client_created`: Otimiza leitura da memória recente do assistente.
- `idx_assistant_facts_client`: Otimiza leitura dos fatos persistidos do assistente.

### Estrutura de Arquivos
O `DATA_DIR` organiza as mídias por cliente:
- `DATA_DIR/media/<client_id>/videos/`
- `DATA_DIR/media/<client_id>/images/`
- `DATA_DIR/media/<client_id>/html/`

## Deploy

O `Dockerfile` utiliza multi-stage build:
1. **Frontend Stage:** Build otimizado com Vite.
2. **Runtime Stage:** Node.js em Debian slim servindo a API e os arquivos estáticos do frontend.

**Recomendações:**
- Monte um volume em `/data`.
- Configure `ADMIN_PASSWORD` via variável de ambiente.
- Use `LOG_REQUESTS=1` para debug de rede.
- Para microfone no assistente fora de `localhost`, publique a aplicação em `HTTPS`.
