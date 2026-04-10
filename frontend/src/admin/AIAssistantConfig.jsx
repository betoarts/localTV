import React, { useState, useEffect } from 'react';
import { Bot, Save, Plus, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE } from '../api';

const AIAssistantConfig = () => {
  const [systemPrompt, setSystemPrompt] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [responseLength, setResponseLength] = useState('curto');
  const [enableOverlay, setEnableOverlay] = useState(true);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/settings/ai`);
      if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json();
      setSystemPrompt(data.systemPrompt || '');
      setSuggestions(data.suggestions || []);
      setResponseLength(data.responseLength || 'curto');
      if (data.enableOverlay !== undefined) {
        setEnableOverlay(data.enableOverlay);
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
      setStatus({ type: 'error', message: 'Erro ao carregar configurações da IA.' });
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/settings/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, suggestions, responseLength, enableOverlay })
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      
      setStatus({ type: 'success', message: 'Configurações salvas com sucesso!' });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      setStatus({ type: 'error', message: 'Erro ao salvar as configurações.' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const handleAddSuggestion = () => {
    if (!newSuggestion.trim()) return;
    setSuggestions([...suggestions, newSuggestion.trim()]);
    setNewSuggestion('');
  };

  const handleRemoveSuggestion = (index) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-mono text-neutral-300 max-w-full lg:max-w-3xl px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 sm:mb-8 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Bot className="text-amber-500" size={24} md={28} />
          <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-neutral-100 uppercase">
            AI_ASSISTANT_CONFIG
          </h2>
        </div>
      </div>
      
      <p className="text-xs text-neutral-400 mb-6 max-w-2xl">
        Personalize o comportamento e o conhecimento básico (contexto) do LocalTV AI, e defina as perguntas de sugestão rápida que aparecem na tela do tablet ou overlay.
      </p>

      {/* Status Message */}
      {status && (
        <div className={`flex items-center gap-3 p-4 border mb-6 text-sm transition-all ${
          status.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {status.type === 'success'
            ? <CheckCircle size={18} className="shrink-0" />
            : <XCircle size={18} className="shrink-0" />
          }
          {status.message}
        </div>
      )}

      {/* Visibilidade do Assistente */}
      <div className="bg-[#0a0a0a] border border-neutral-800 p-6 mb-4 group hover:border-amber-500/40 transition-colors flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest mb-1">
            Exibir Assistente sobre os Vídeos (Overlay)
          </h3>
          <p className="text-xs text-neutral-500">
            Habilita ou desabilita o ícone flutuante do robô na tela principal (player de vídeos).
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={enableOverlay}
            onChange={(e) => setEnableOverlay(e.target.checked)}
          />
          <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
        </label>
      </div>

      {/* System Prompt */}
      <div className="bg-[#0a0a0a] border border-neutral-800 p-6 mb-4 group hover:border-amber-500/40 transition-colors">
        <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest mb-1">
          1. Contexto e Identidade (System Prompt)
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Este é o conjunto de regras principal lido pela IA (Gemini, Gemma, OpenAI) antes de cada resposta. Aqui você informa como ele deve agir e informações sobre o local.
        </p>
        
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm p-4 min-h-[150px] focus:outline-none focus:border-amber-500 font-sans mb-4"
          placeholder="Ex: Você é um assistente virtual..."
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-t border-neutral-800 mt-2 pt-4">
          <label className="text-sm font-bold text-neutral-300 tracking-widest uppercase">
            Tamanho da Resposta:
          </label>
          <select
            value={responseLength}
            onChange={(e) => setResponseLength(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm px-4 py-2 focus:outline-none focus:border-amber-500 font-sans cursor-pointer"
          >
            <option value="curtissimo">Curtíssimo (Máx. 1-2 Frases)</option>
            <option value="curto">Curto (Um Parágrafo Resumido)</option>
            <option value="medio">Médio (Padrão, 2 a 3 Parágrafos)</option>
            <option value="longo">Longo (Aprofundado e Detalhado)</option>
          </select>
          <p className="text-xs text-neutral-500 mt-1 sm:mt-0 flex-1">
            Recomendamos respostas curtas para evitar que o robô demore muito falando na TV.
          </p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="bg-[#0a0a0a] border border-neutral-800 p-6 mb-6 group hover:border-amber-500/40 transition-colors">
        <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest mb-1">
          2. Perguntas Rápidas (Sugestões)
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Botões de atalho exibidos acima do campo de digitação na tela principal do assistente. Ideal para dúvidas frequentes.
        </p>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm px-4 py-2.5 focus:outline-none focus:border-amber-500 font-sans"
            placeholder="Digite uma nova sugestão..."
            value={newSuggestion}
            onChange={(e) => setNewSuggestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSuggestion()}
          />
          <button
            onClick={handleAddSuggestion}
            className="flex items-center gap-2 bg-amber-600/20 text-amber-400 border border-amber-600/50 hover:bg-amber-500 hover:text-[#050505] px-4 py-2.5 transition-all text-xs font-bold tracking-widest"
          >
            <Plus size={16} /> ADD
          </button>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 flex flex-col">
          {suggestions.length === 0 ? (
            <div className="p-4 text-xs text-neutral-500 italic">
              Nenhuma sugestão configurada.
            </div>
          ) : (
            suggestions.map((item, index) => (
              <div 
                key={index} 
                className={`flex items-center justify-between p-3 ${index < suggestions.length - 1 ? 'border-b border-neutral-800' : ''}`}
              >
                <div className="text-sm text-neutral-300 font-sans">{item}</div>
                <button
                  onClick={() => handleRemoveSuggestion(index)}
                  className="text-neutral-500 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-green-600/20 text-green-400 border border-green-600/50 hover:bg-green-500 hover:text-[#050505] px-6 py-3 transition-all uppercase text-sm font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {saving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </button>
      </div>
    </div>
  );
};

export default AIAssistantConfig;
