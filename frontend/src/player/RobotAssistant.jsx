import { useState, useRef, useEffect, useCallback } from 'react';
import { sendChatMessage, API_BASE } from '../api';
import './RobotAssistant.css';

const PROVIDERS = [
  { id: 'gemma', label: 'Gemma' },
  { id: 'gemini', label: 'Gemini' },
  { id: 'openai', label: 'OpenAI' },
];

const Avatar = ({ speaking, className = '' }) => (
  <div className={`ra-avatar ${speaking ? 'speaking' : ''} ${className}`}>
    <div className="ra-antenna" />
    <div className="ra-avatar-head">
      <div className="ra-eyes">
        <div className="ra-eye" />
        <div className="ra-eye" />
      </div>
      <div className="ra-mouth" />
    </div>
  </div>
);

const RobotAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [provider, setProvider] = useState('gemini');
  const [dynamicSuggestions, setDynamicSuggestions] = useState([]);
  const [enableOverlay, setEnableOverlay] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/ai`)
      .then(res => res.json())
      .then(data => {
        if (data.enableOverlay !== undefined) {
          setEnableOverlay(data.enableOverlay);
        }
        if (data.suggestions && data.suggestions.length > 0) {
          setDynamicSuggestions(data.suggestions.slice(0, 3)); // Only show top 3 inside the panel
        }
      })
      .catch(err => console.error('Failed to load AI config:', err));
  }, []);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

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

  const sendQuery = async (text) => {
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await sendChatMessage(text, provider);
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
        content: 'Não consegui me conectar ao servidor. Verifique a conexão.',
        provider: 'error',
        time: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendQuery(input.trim());
  const handleSendSuggested = (text) => sendQuery(text);

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

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!enableOverlay) return null;

  if (!open) {
    return (
      <div className="ra-container">
        <button
          className="ra-toggle"
          onClick={() => setOpen(true)}
          title="Abrir assistente"
          id="robot-assistant-toggle"
        >
          🤖
        </button>
      </div>
    );
  }

  return (
    <div className="ra-container">
      <div className="ra-panel">
        {/* Header */}
        <div className="ra-header">
          <Avatar speaking={speaking} />
          <div>
            <div className="ra-header-title">LocalTV AI</div>
            <div className="ra-header-provider">
              {speaking ? '🔊 Falando...' : `via ${provider}`}
            </div>
          </div>
          <div className="ra-header-actions">
            <button
              className={`ra-btn-icon ${muted ? '' : 'active'}`}
              onClick={toggleMute}
              title={muted ? 'Ativar voz' : 'Silenciar'}
            >
              {muted ? '🔇' : '🔊'}
            </button>
            <button
              className="ra-btn-icon"
              onClick={() => setOpen(false)}
              title="Minimizar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="ra-messages">
          {messages.length === 0 && !loading && (
            <div className="ra-welcome">
              <Avatar speaking={false} className="ra-welcome-avatar" />
              <div className="ra-welcome-text">
                Olá! Sou o assistente da LocalTV. Como posso ajudar?
              </div>
              <div className="ra-welcome-hint">
                Digite sua pergunta abaixo ou escolha uma sugestão:
              </div>
              <div className="ra-welcome-suggestions" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
                {dynamicSuggestions.map((s, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSendSuggested(s)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(0, 230, 255, 0.2)',
                      background: 'rgba(0, 230, 255, 0.05)',
                      color: 'rgba(0, 230, 255, 0.8)',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`ra-msg ${msg.role}`}>
              {msg.content}
              <div className="ra-msg-meta">
                {formatTime(msg.time)}
                {msg.provider && msg.provider !== 'error' && (
                  <> · {msg.provider}{msg.fallback ? ' (fallback)' : ''}</>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="ra-thinking">
              <div className="ra-thinking-dots">
                <div className="ra-thinking-dot" />
                <div className="ra-thinking-dot" />
                <div className="ra-thinking-dot" />
              </div>
              <span className="ra-thinking-text">Pensando...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Provider selector */}
        <div className="ra-provider-bar">
          {PROVIDERS.map(p => (
            <button
              key={p.id}
              className={`ra-provider-btn ${provider === p.id ? 'selected' : ''}`}
              onClick={() => setProvider(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="ra-input-area">
          <input
            ref={inputRef}
            className="ra-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            maxLength={2000}
            id="robot-assistant-input"
          />
          <button
            className="ra-send-btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            title="Enviar"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default RobotAssistant;
