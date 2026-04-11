const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Define default AI settings
const defaultAiSettings = {
  systemPrompt: `Você é um assistente virtual de TV inteligente chamado "LocalTV AI". 
Responda de forma concisa, amigável e informativa. Máximo 3 frases por resposta.
Você ajuda com informações gerais, notícias, clima e entretenimento.`,
  enableVoice: true,
  suggestions: [
    'Que horas são?',
    'Qual a previsão do tempo?',
    'Me conte uma curiosidade',
    'Quais os filmes em cartaz?'
  ]
};

// Handle retrieval of a specific key
const getSetting = (key) => {
  return new Promise((resolve) => {
    db.get('SELECT value FROM app_settings WHERE key = ?', [key], (err, row) => {
      if (err || !row) resolve(null);
      else resolve(row.value);
    });
  });
};

// Handle insertion/update of a specific key
const setSetting = (key, value) => {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP',
      [key, value],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
};

router.get('/ai', async (req, res) => {
  try {
    const rawVal = await getSetting('ai_config');
    if (rawVal) {
      return res.json(JSON.parse(rawVal));
    }
    // Return defaults if none found
    res.json(defaultAiSettings);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    res.status(500).json({ error: 'Failed to fetch AI config' });
  }
});

router.post('/ai', async (req, res) => {
  try {
    const { systemPrompt, suggestions, responseLength, enableOverlay, enableVoice } = req.body;
    
    // Basic validation
    if (!systemPrompt || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const payload = JSON.stringify({ 
      systemPrompt, 
      suggestions, 
      responseLength: responseLength || 'curto',
      enableOverlay: enableOverlay !== undefined ? enableOverlay : true,
      enableVoice: enableVoice !== undefined ? enableVoice : true
    });
    await setSetting('ai_config', payload);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving AI settings:', error);
    res.status(500).json({ error: 'Failed to save AI config' });
  }
});

module.exports = router;
