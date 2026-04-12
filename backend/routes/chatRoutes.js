const express = require('express');
const router = express.Router();

const { db } = require('../database');

const gemmaService = require('../services/gemmaService');
const geminiService = require('../services/geminiService');
const groqService = require('../services/groqService');
const openaiService = require('../services/openaiService');

const providers = {
  gemma: gemmaService,
  gemini: geminiService,
  groq: groqService,
  openai: openaiService,
};

const FALLBACK_ORDER = ['gemma', 'gemini', 'groq', 'openai'];
const DEFAULT_CLIENT_ID = 'default';
const MEMORY_LIMIT = 20;
const FACT_LIMIT = 10;

const defaultSystemPrompt = `Você é um assistente virtual de TV inteligente chamado "LocalTV AI". 
Responda de forma concisa, amigável e informativa. Máximo 3 frases por resposta.
Você ajuda com informações gerais, notícias, clima e entretenimento.`;

const lengthInstructions = {
  curtissimo: '\n\nIMPORTANTE (REGRA RESTRITA): Você DEVE responder de forma extremamente curta e concisa, usando no máximo 1 ou 2 frases curtas. Não escreva parágrafos longos, seja direto.',
  curto: '\n\nIMPORTANTE: Responda de forma curta e objetiva, resumindo as informações para não ficar prolixo. O ideal é no máximo 1 único parágrafo com cerca de 3 a 4 frases.',
  medio: '\n\nIMPORTANTE: Responda de forma natural, mas evite longos textos sem necessidade. Mantenha em 2 ou 3 parágrafos no máximo.',
  longo: '\n\nNOTA: Você tem liberdade para elaborar uma resposta mais detalhada e aprofundada, explicando com múltiplos parágrafos se for necessário.'
};

const getSystemPrompt = () => {
  return new Promise((resolve) => {
    db.get('SELECT value FROM app_settings WHERE key = ?', ['ai_config'], (err, row) => {
      if (err || !row) resolve(defaultSystemPrompt);
      else {
        try {
          const config = JSON.parse(row.value);
          const basePrompt = config.systemPrompt || defaultSystemPrompt;
          const lengthPref = config.responseLength || 'curto';
          const finalPrompt = basePrompt + (lengthInstructions[lengthPref] || '');
          resolve(finalPrompt);
        } catch {
          resolve(defaultSystemPrompt);
        }
      }
    });
  });
};

const getClientId = (req) => {
  const header = req.headers['x-client-id'];
  const query = req.query?.client_id;
  const body = req.body?.client_id;
  const clientId = header || query || body || DEFAULT_CLIENT_ID;
  return typeof clientId === 'string' && clientId.trim() ? clientId.trim() : DEFAULT_CLIENT_ID;
};

const getMemory = (clientId) => {
  return new Promise((resolve) => {
    db.all(
      `SELECT role, content
       FROM assistant_memory
       WHERE client_id = ?
       ORDER BY id DESC
       LIMIT ?`,
      [clientId, MEMORY_LIMIT],
      (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(rows.reverse());
      }
    );
  });
};

const saveMemoryPair = (clientId, userMessage, assistantReply) => {
  return new Promise((resolve) => {
    db.serialize(() => {
      db.run(
        'INSERT INTO assistant_memory (client_id, role, content) VALUES (?, ?, ?)',
        [clientId, 'user', userMessage]
      );
      db.run(
        'INSERT INTO assistant_memory (client_id, role, content) VALUES (?, ?, ?)',
        [clientId, 'assistant', assistantReply]
      );
      db.run(
        `DELETE FROM assistant_memory
         WHERE client_id = ?
           AND id NOT IN (
             SELECT id FROM assistant_memory WHERE client_id = ? ORDER BY id DESC LIMIT ?
           )`,
        [clientId, clientId, MEMORY_LIMIT],
        () => resolve()
      );
    });
  });
};

const getFacts = (clientId) => {
  return new Promise((resolve) => {
    db.all(
      `SELECT fact_key, fact_value
       FROM assistant_facts
       WHERE client_id = ?
       ORDER BY updated_at DESC
       LIMIT ?`,
      [clientId, FACT_LIMIT],
      (err, rows) => {
        if (err || !rows) return resolve([]);
        resolve(rows);
      }
    );
  });
};

const factPatterns = [
  { key: 'name', regex: /\bmeu nome e\s+([a-zà-ÿ' -]{2,60})/i },
  { key: 'city', regex: /\b(?:moro em|sou de)\s+([a-zà-ÿ' -]{2,60})/i },
  { key: 'work', regex: /\btrabalho com\s+([a-zà-ÿ0-9' -]{2,80})/i },
  { key: 'likes', regex: /\beu gosto de\s+([a-zà-ÿ0-9, ' -]{2,120})/i },
  { key: 'favorite_team', regex: /\bmeu time e\s+([a-zà-ÿ0-9' -]{2,80})/i },
  { key: 'favorite_color', regex: /\bminha cor favorita e\s+([a-zà-ÿ' -]{2,40})/i },
];

const normalizeFactValue = (value) => {
  return value
    .trim()
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ');
};

const extractFactsFromMessage = (message) => {
  const facts = [];

  factPatterns.forEach(({ key, regex }) => {
    const match = message.match(regex);
    if (!match?.[1]) return;

    const value = normalizeFactValue(match[1]);
    if (value.length < 2) return;
    facts.push({ key, value });
  });

  return facts;
};

const saveFacts = (clientId, facts) => {
  if (!facts.length) return Promise.resolve();

  return new Promise((resolve) => {
    db.serialize(() => {
      facts.forEach((fact) => {
        db.run(
          `INSERT INTO assistant_facts (client_id, fact_key, fact_value)
           VALUES (?, ?, ?)
           ON CONFLICT(client_id, fact_key)
           DO UPDATE SET fact_value = excluded.fact_value, updated_at = CURRENT_TIMESTAMP`,
          [clientId, fact.key, fact.value]
        );
      });
      resolve();
    });
  });
};

const clearMemory = (clientId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM assistant_memory WHERE client_id = ?', [clientId], function (memoryErr) {
        if (memoryErr) return reject(memoryErr);
        const memoryCleared = this.changes || 0;

        db.run('DELETE FROM assistant_facts WHERE client_id = ?', [clientId], function (factsErr) {
          if (factsErr) reject(factsErr);
          else {
            resolve({
              memoryCleared,
              factsCleared: this.changes || 0,
            });
          }
        });
      });
    });
  });
};

const buildFactsPrompt = (facts) => {
  if (!facts.length) return '';

  const lines = facts.map((fact) => `- ${fact.fact_key}: ${fact.fact_value}`).join('\n');
  return `\n\nMemoria relevante do usuario:\n${lines}\nUse essas informacoes apenas quando forem realmente uteis.`;
};

async function chatWithFallback(message, preferredProvider, memory, facts) {
  const systemPrompt = `${await getSystemPrompt()}${buildFactsPrompt(facts)}`;
  const conversation = [...memory, { role: 'user', content: message }];

  // Build ordered list: preferred first, then remaining in fallback order
  const order = preferredProvider && providers[preferredProvider]
    ? [preferredProvider, ...FALLBACK_ORDER.filter(p => p !== preferredProvider)]
    : [...FALLBACK_ORDER];

  const errors = [];

  for (const providerName of order) {
    const service = providers[providerName];
    if (!service) continue;

    try {
      console.log(`[Chat] Trying provider: ${providerName}`);
      const reply = await service.chat(conversation, systemPrompt);
      const usedFallback = providerName !== (preferredProvider || FALLBACK_ORDER[0]);
      console.log(`[Chat] Success with ${providerName}${usedFallback ? ' (fallback)' : ''}`);
      return { reply, provider: providerName, fallback: usedFallback };
    } catch (err) {
      const reason = err.name === 'AbortError' ? 'timeout' : err.message;
      console.warn(`[Chat] Provider ${providerName} failed: ${reason}`);
      errors.push({ provider: providerName, error: reason });
    }
  }

  console.error('[Chat] All providers failed:', errors);
  return {
    reply: 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.',
    provider: 'none',
    fallback: true,
    errors,
  };
}

router.post('/chat', async (req, res) => {
  try {
    const { message, provider } = req.body;
    const clientId = getClientId(req);

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    }

    const trimmedMessage = message.trim();
    const memory = await getMemory(clientId);
    const facts = await getFacts(clientId);
    const result = await chatWithFallback(trimmedMessage, provider, memory, facts);
    await saveMemoryPair(clientId, trimmedMessage, result.reply);
    await saveFacts(clientId, extractFactsFromMessage(trimmedMessage));
    res.json(result);
  } catch (err) {
    console.error('[Chat] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/chat/memory', async (req, res) => {
  try {
    const clientId = getClientId(req);
    const [memory, facts] = await Promise.all([getMemory(clientId), getFacts(clientId)]);
    res.json({
      client_id: clientId,
      count: memory.length,
      items: memory,
      facts_count: facts.length,
      facts,
    });
  } catch (err) {
    console.error('[Chat] Failed to load memory:', err);
    res.status(500).json({ error: 'Failed to load assistant memory' });
  }
});

router.delete('/chat/memory', async (req, res) => {
  try {
    const clientId = getClientId(req);
    const cleared = await clearMemory(clientId);
    res.json({ success: true, client_id: clientId, cleared });
  } catch (err) {
    console.error('[Chat] Failed to clear memory:', err);
    res.status(500).json({ error: 'Failed to clear assistant memory' });
  }
});

// Health check for AI providers
router.get('/chat/status', (req, res) => {
  res.json({
    providers: Object.keys(providers),
    fallback_order: FALLBACK_ORDER,
    gemini_configured: !!process.env.GEMINI_API_KEY,
    groq_configured: !!process.env.GROQ_API_KEY,
    openai_configured: !!process.env.OPENAI_API_KEY,
  });
});

module.exports = router;
