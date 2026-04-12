import { useState, useRef, useEffect, useCallback } from 'react';
import { API_BASE, clearAssistantMemory, sendChatMessage } from '../api';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import './AssistantPage.css';

const SUGGESTIONS = [
  'Que horas são?',
  'Qual a previsão do tempo?',
  'Me conte uma curiosidade',
  'Quais os filmes em cartaz?',
];

const AssistantPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState(SUGGESTIONS);
  const [voiceNotice, setVoiceNotice] = useState('');
  const [pushToTalkActive, setPushToTalkActive] = useState(false);
  const [enableVoice, setEnableVoice] = useState(true);
  const [clearingMemory, setClearingMemory] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const {
    supported: voiceSupported,
    secureContext,
    listening,
    transcript,
    error: voiceError,
    startListening,
    stopListening,
    clearError,
  } = useSpeechRecognition({
    lang: 'pt-BR',
    onInterimResult: (partial) => {
      setInput(partial);
    },
    onFinalResult: (finalText) => {
      setInput(finalText);
      setVoiceNotice('Pergunta capturada. Enviando...');
      handleSend(finalText);
    },
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
    
    // Fetch suggestions from backend
    fetch(`${API_BASE}/api/settings/ai`)
      .then(res => res.json())
      .then(data => {
        if (data.suggestions && data.suggestions.length > 0) {
          setDynamicSuggestions(data.suggestions);
        }
        if (data.enableVoice !== undefined) {
          setEnableVoice(data.enableVoice);
        }
      })
      .catch(err => console.error('Failed to load AI config:', err));
  }, []);

  // Auto-fullscreen on mount + first user interaction (tablets require gesture)
  useEffect(() => {
    const enterFullscreen = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    };

    enterFullscreen();

    const handler = () => {
      enterFullscreen();
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };

    document.addEventListener('click', handler, { once: true });
    document.addEventListener('touchstart', handler, { once: true });

    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      stopListening();
    };
  }, [stopListening]);

  useEffect(() => {
    if (voiceError) {
      setVoiceNotice(voiceError);
    }
  }, [voiceError]);

  useEffect(() => {
    if (!listening && transcript && !voiceError) {
      setVoiceNotice('Transcricao concluida.');
    }
  }, [listening, transcript, voiceError]);

  const speak = useCallback((text) => {
    if (muted || !synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.05;
    utterance.pitch = 1;

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    synthRef.current.speak(utterance);
  }, [muted]);

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setVoiceNotice('');
    clearError();
    setLoading(true);

    try {
      const result = await sendChatMessage(msg);
      const assistantMsg = {
        role: 'assistant',
        content: result.reply,
        provider: result.provider,
        fallback: result.fallback,
        time: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      speak(result.reply);
    } catch {
      const errorMsg = {
        role: 'assistant',
        content: 'Não consegui me conectar. Verifique a conexão com o servidor.',
        provider: 'error',
        time: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMute = () => {
    if (!muted) {
      synthRef.current?.cancel();
      setSpeaking(false);
    }
    setMuted(prev => !prev);
  };

  const clearChat = () => {
    synthRef.current?.cancel();
    stopListening();
    setSpeaking(false);
    setMessages([]);
    setInput('');
    setVoiceNotice('');
    clearError();
  };

  const handleClearMemory = async () => {
    if (clearingMemory) return;
    setClearingMemory(true);
    try {
      await clearAssistantMemory();
      clearChat();
      setVoiceNotice('Memoria do assistente apagada.');
    } catch {
      setVoiceNotice('Nao foi possivel limpar a memoria do assistente.');
    } finally {
      setClearingMemory(false);
    }
  };

  const toggleListening = (e) => {
    e?.preventDefault?.();
    if (loading || !enableVoice || !voiceSupported || !secureContext) return;

    if (listening) {
      stopListening();
      setVoiceNotice('Processando fala...');
    } else {
      const started = startListening();
      if (started) {
        setVoiceNotice('Ouvindo... toque novamente para finalizar.');
        inputRef.current?.focus();
      }
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="ast-page">
      {/* Status bar hider */}
      <style>{`html, body { overflow: hidden !important; background: #060d18 !important; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <header className="ast-header">
        <div className={`ast-header-avatar ${speaking ? 'speaking' : ''}`}>
          <div className="ast-antenna" />
          <div className="ast-header-head">
            <div className="ast-h-eyes">
              <div className="ast-h-eye" />
              <div className="ast-h-eye" />
            </div>
            <div className="ast-h-mouth" />
          </div>
        </div>

        <div className="ast-header-info">
          <div className="ast-header-title">LocalTV AI Assistant</div>
          <div className="ast-header-subtitle">
            {listening
              ? '🎙️ Ouvindo...'
              : speaking
                ? '🔊 Falando...'
                : loading
                  ? '⏳ Processando...'
                  : 'Pronto'}
          </div>
        </div>

        <div className="ast-header-controls">
          <button
            className={`ast-ctrl-btn ${muted ? '' : 'active'}`}
            onClick={toggleMute}
            title={muted ? 'Ativar voz' : 'Silenciar'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="ast-ctrl-btn"
            onClick={clearChat}
            title="Limpar conversa"
          >
            🗑️
          </button>
          <button
            className="ast-ctrl-btn"
            onClick={handleClearMemory}
            title="Limpar memoria"
            disabled={clearingMemory}
          >
            🧠
          </button>
          <button
            className="ast-ctrl-btn"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
            title="Fullscreen"
          >
            ⛶
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="ast-messages">
        {messages.length === 0 && !loading && (
          <div className="ast-welcome">
            <div className="ast-welcome-avatar">
              <div className="ast-antenna" />
              <div className="ast-welcome-head">
                <div className="ast-welcome-eyes">
                  <div className="ast-welcome-eye" />
                  <div className="ast-welcome-eye" />
                </div>
                <div className="ast-welcome-mouth" />
              </div>
            </div>

            <div className="ast-welcome-title">Olá! Como posso ajudar?</div>
            <div className="ast-welcome-desc">
              Sou o assistente virtual da LocalTV. Pergunte qualquer coisa — posso falar sobre notícias, clima, curiosidades e muito mais.
            </div>

            <div className="ast-welcome-suggestions">
              {dynamicSuggestions.map((s, i) => (
                <button 
                  key={i} 

                  className="ast-suggestion"
                  onClick={() => handleSend(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`ast-msg ${msg.role}`}>
            {msg.content}
            <div className="ast-msg-meta">
              {formatTime(msg.time)}
              {msg.provider && msg.provider !== 'error' && (
                <> · {msg.provider}{msg.fallback ? ' (fallback)' : ''}</>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ast-thinking">
            <div className="ast-thinking-dots">
              <div className="ast-thinking-dot" />
              <div className="ast-thinking-dot" />
              <div className="ast-thinking-dot" />
            </div>
            <span className="ast-thinking-text">Pensando...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ast-input-area">
        <button
          className={`ast-voice-btn ${listening ? 'listening' : ''}`}
          onClick={toggleListening}
          disabled={loading || !enableVoice || !voiceSupported || !secureContext}
          title={
            !enableVoice
              ? 'Microfone desativado no painel administrativo'
              : !voiceSupported
              ? 'Reconhecimento de voz nao suportado'
              : !secureContext
                ? 'Microfone requer HTTPS ou localhost'
                : listening
                  ? 'Clique para finalizar'
                  : 'Clique para falar'
          }
        >
          {listening ? '■' : '🎙️'}
        </button>
        <input
          ref={inputRef}
          className="ast-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            enableVoice && voiceSupported
              ? 'Digite ou toque no microfone para falar...'
              : 'Digite sua mensagem...'
          }
          disabled={loading}
          maxLength={2000}
          id="assistant-page-input"
        />
        <button
          className="ast-send"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          title="Enviar"
        >
          ➤
        </button>
      </div>
      <div className={`ast-voice-status ${voiceNotice ? 'visible' : ''}`}>
        {voiceNotice || (
          !enableVoice
            ? 'Microfone desativado pelo administrador.'
            : voiceSupported
              ? 'Pressione o microfone para falar.'
              : 'Reconhecimento de voz indisponivel neste navegador.'
        )}
      </div>

      {/* Immersive Speaking Overlay */}
      {speaking && messages.length > 0 && (
        <div className="ast-immersive-overlay" onClick={() => {
          synthRef.current?.cancel();
          setSpeaking(false);
        }}>
          <div className="ast-immersive-avatar speaking">
              <div className="ast-antenna" />
              <div className="ast-immersive-head">
                <div className="ast-immersive-eyes">
                  <div className="ast-immersive-eye" />
                  <div className="ast-immersive-eye" />
                </div>
                <div className="ast-immersive-mouth" />
              </div>
          </div>
          <div className="ast-immersive-text">
            {messages[messages.length - 1]?.role === 'assistant' 
              ? messages[messages.length - 1].content 
              : ''}
          </div>
          <div className="ast-immersive-sub">Toque para interromper</div>
        </div>
      )}
    </div>
  );
};

export default AssistantPage;
