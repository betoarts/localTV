const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GEMMA_MODEL = process.env.GEMMA_MODEL || 'gemma';
const GEMMA_TIMEOUT = 60000;

async function chat(messages, systemPrompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMMA_TIMEOUT);

  const transcript = messages
    .map((item) => `${item.role === 'assistant' ? 'Assistente' : 'Usuário'}: ${item.content}`)
    .join('\n');

  try {
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        prompt: `${systemPrompt}\n\n${transcript}\nAssistente:`,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama responded with status ${res.status}`);
    }

    const data = await res.json();
    return data.response?.trim() || 'Sem resposta do modelo.';
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { chat };
