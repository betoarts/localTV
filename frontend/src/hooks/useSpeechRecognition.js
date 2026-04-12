import { useCallback, useEffect, useRef, useState } from 'react';

const SpeechRecognitionCtor =
  typeof window !== 'undefined'
    ? (() => {
        const ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
        console.log('[SpeechRecognition] Available:', !!ctor, 'Constructor:', ctor?.name);
        return ctor;
      })()
    : null;

const isLocalHost = () => {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const getErrorMessage = (error) => {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Permissao do microfone negada. Libere o acesso no navegador.';
    case 'no-speech':
      return 'Nao detectei fala. Tente novamente.';
    case 'audio-capture':
      return 'Nao foi possivel acessar o microfone deste dispositivo.';
    case 'network':
      return 'Falha de rede no reconhecimento de voz.';
    case 'aborted':
      return 'Captura de voz interrompida.';
    case 'language-not-supported':
      return 'O idioma pt-BR nao esta disponivel neste navegador.';
    default:
      return 'Reconhecimento de voz indisponivel neste navegador.';
  }
};

export function useSpeechRecognition({ lang = 'pt-BR', onFinalResult, onInterimResult } = {}) {
  const recognitionRef = useRef(null);
  const finalResultRef = useRef(onFinalResult);
  const interimResultRef = useRef(onInterimResult);

  const [supported, setSupported] = useState(Boolean(SpeechRecognitionCtor));
  const [secureContext, setSecureContext] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    finalResultRef.current = onFinalResult;
    interimResultRef.current = onInterimResult;
  }, [onFinalResult, onInterimResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('[SpeechRecognition] Checking support...', { SpeechRecognitionCtor, isSecure: window.isSecureContext, hostname: window.location.hostname });
    setSupported(Boolean(SpeechRecognitionCtor));
    setSecureContext(window.isSecureContext || isLocalHost());

    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = lang;
    console.log('[SpeechRecognition] Created instance:', recognition);
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setError('');
      setTranscript('');
      setListening(true);
    };

    console.log('[SpeechRecognition] Setting up event handlers');
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = event.results[i][0]?.transcript?.trim() || '';
        if (!text) continue;
        console.log('[SpeechRecognition] Result:', { text, isFinal: event.results[i].isFinal });

        if (event.results[i].isFinal) {
          finalText = `${finalText} ${text}`.trim();
        } else {
          interimText = `${interimText} ${text}`.trim();
        }
      }

      const nextTranscript = finalText || interimText;
      setTranscript(nextTranscript);

      if (interimText) {
        interimResultRef.current?.(interimText);
      }

      if (finalText) {
        finalResultRef.current?.(finalText);
      }
    };

    recognition.onerror = (event) => {
      setListening(false);
      console.error('[SpeechRecognition] Error:', event.error, event);
      if (event.error !== 'aborted') {
        setError(getErrorMessage(event.error));
      }
    };

    console.log('[SpeechRecognition] Starting recognition...');
    recognition.onend = () => {
      console.log('[SpeechRecognition] Recognition ended');
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onstart = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      console.error('[SpeechRecognition] No recognition instance available');
      setError('Reconhecimento de voz nao suportado neste navegador.');
      return false;
    }

    if (!secureContext) {
      console.error('[SpeechRecognition] Not in secure context');
      setError('Microfone requer HTTPS ou localhost para funcionar.');
      return false;
    }

    setError('');
    setTranscript('');

    try {
      console.log('[SpeechRecognition] Calling recognitionRef.current.start()');
      recognitionRef.current.start();
      console.log('[SpeechRecognition] start() called successfully');
      return true;
    } catch (err) {
      console.error('[SpeechRecognition] start() threw error:', err);
      const message = err?.name === 'InvalidStateError'
        ? 'O microfone ja esta em uso pelo reconhecimento.'
        : 'Nao foi possivel iniciar o microfone.';
      setError(message);
      return false;
    }
  }, [secureContext]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  return {
    supported,
    secureContext,
    listening,
    transcript,
    error,
    startListening,
    stopListening,
    clearError,
  };
}
