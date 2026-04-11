import { useEffect, useState } from 'react';
import { Bot, Brain, CheckCircle, RefreshCcw, Trash2, XCircle } from 'lucide-react';
import { clearAssistantMemoryForClient, getAssistantMemoryForClient, getClientId } from '../api';

const AssistantMemory = () => {
  const [memory, setMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [status, setStatus] = useState(null);
  const clientId = getClientId();

  const loadMemory = async () => {
    try {
      setLoading(true);
      const data = await getAssistantMemoryForClient(clientId);
      setMemory(data);
    } catch (error) {
      console.error('Error fetching assistant memory:', error);
      setStatus({ type: 'error', message: 'Erro ao carregar memoria do assistente.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [clientId]);

  const handleClear = async () => {
    try {
      setClearing(true);
      await clearAssistantMemoryForClient(clientId);
      setStatus({ type: 'success', message: 'Memoria apagada com sucesso.' });
      await loadMemory();
    } catch (error) {
      console.error('Error clearing assistant memory:', error);
      setStatus({ type: 'error', message: 'Erro ao apagar memoria do assistente.' });
    } finally {
      setClearing(false);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-neutral-800 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="font-mono text-neutral-300 max-w-full lg:max-w-5xl px-1">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Brain className="text-amber-500" size={24} />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-widest text-neutral-100 uppercase">
              ASSISTANT_MEMORY
            </h2>
            <p className="text-xs text-neutral-500 mt-1">Cliente ativo: {clientId}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadMemory}
            className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 text-xs tracking-widest hover:border-amber-500/40"
          >
            <RefreshCcw size={14} /> ATUALIZAR
          </button>
          <button
            onClick={handleClear}
            disabled={clearing}
            className="flex items-center gap-2 bg-red-600/15 text-red-400 border border-red-600/40 px-4 py-2 text-xs tracking-widest hover:bg-red-600/25 disabled:opacity-50"
          >
            <Trash2 size={14} /> LIMPAR MEMORIA
          </button>
        </div>
      </div>

      {status && (
        <div className={`flex items-center gap-3 p-4 border mb-6 text-sm ${
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

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-[#0a0a0a] border border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="text-amber-500" size={18} />
            <h3 className="text-sm font-bold tracking-widest uppercase text-neutral-100">
              Fatos Persistidos
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Informacoes semanticas extraidas da conversa, reutilizadas como contexto.
          </p>
          <div className="space-y-3">
            {memory?.facts?.length ? memory.facts.map((fact, index) => (
              <div key={`${fact.fact_key}-${index}`} className="border border-neutral-800 bg-neutral-900 px-4 py-3">
                <div className="text-[11px] uppercase tracking-widest text-amber-400">{fact.fact_key}</div>
                <div className="text-sm text-neutral-200 mt-1 font-sans">{fact.fact_value}</div>
              </div>
            )) : (
              <div className="text-xs text-neutral-500 italic border border-neutral-800 bg-neutral-900 px-4 py-4">
                Nenhum fato persistido para este cliente.
              </div>
            )}
          </div>
        </section>

        <section className="bg-[#0a0a0a] border border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="text-amber-500" size={18} />
            <h3 className="text-sm font-bold tracking-widest uppercase text-neutral-100">
              Historico Curto
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mb-4">
            Ultimas mensagens persistidas para manter contexto recente.
          </p>
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {memory?.items?.length ? memory.items.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`border px-4 py-3 ${
                  item.role === 'assistant'
                    ? 'border-neutral-800 bg-neutral-900'
                    : 'border-amber-500/20 bg-amber-500/5'
                }`}
              >
                <div className="text-[11px] uppercase tracking-widest text-neutral-500">
                  {item.role === 'assistant' ? 'ASSISTENTE' : 'USUARIO'}
                </div>
                <div className="text-sm text-neutral-200 mt-1 font-sans whitespace-pre-wrap">{item.content}</div>
              </div>
            )) : (
              <div className="text-xs text-neutral-500 italic border border-neutral-800 bg-neutral-900 px-4 py-4">
                Nenhum historico persistido para este cliente.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AssistantMemory;
