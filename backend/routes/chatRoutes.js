const express = require('express');
const router = express.Router();

const { db } = require('../database');

const gemmaService = require('../services/gemmaService');
const geminiService = require('../services/geminiService');
const openaiService = require('../services/openaiService');

const providers = {
  gemma: gemmaService,
  gemini: geminiService,
  openai: openaiService,
};

const FALLBACK_ORDER = ['gemma', 'gemini', 'openai'];

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

async function chatWithFallback(message, preferredProvider) {
  const systemPrompt = await getSystemPrompt();

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
      const reply = await service.chat(message, systemPrompt);
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

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 chars)' });
    }

    const result = await chatWithFallback(message.trim(), provider);
    res.json(result);
  } catch (err) {
    console.error('[Chat] Unexpected error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check for AI providers
router.get('/chat/status', (req, res) => {
  res.json({
    providers: Object.keys(providers),
    fallback_order: FALLBACK_ORDER,
    gemini_configured: !!process.env.GEMINI_API_KEY,
    openai_configured: !!process.env.OPENAI_API_KEY,
  });
});

module.exports = router;
