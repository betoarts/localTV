import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api';

const API_URL = `${API_BASE}/api`;

const POSITION_MAP = {
  'top-right':     { top: '3%', right: '2%' },
  'top-left':      { top: '3%', left: '2%' },
  'bottom-right':  { bottom: '3%', right: '2%' },
  'bottom-left':   { bottom: '3%', left: '2%' },
  'top-center':    { top: '3%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-center': { bottom: '3%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-bar':    { bottom: '0', left: '0', right: '0', width: '100%', borderRadius: '0' },
};

const DEFAULT_REFRESH = 600000; // 10 minutes

const NewsWidget = ({
  feedUrl,
  position = 'bottom-center',
  refreshInterval = DEFAULT_REFRESH,
  mode = 'fade', // 'fade' or 'marquee'
  rotationSpeed = 8000, // 8s per item in fade mode
  marqueeSpeed = 6, // speed multiplier for marquee
  showImages = false,
  maxItems = 10,
}) => {
  const [news, setNews] = useState(null);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const intervalRef = useRef(null);
  const rotationRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setVisible(false);

    if (!feedUrl) return;

    const doFetch = async () => {
      try {
        const res = await fetch(`${API_URL}/news?url=${encodeURIComponent(feedUrl)}`);
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        
        // Ensure max items
        if (data.items && data.items.length > maxItems) {
          data.items = data.items.slice(0, maxItems);
        }
        
        setNews(data);
        setError(false);
        setVisible(true);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    doFetch();
    const interval = Math.max(refreshInterval || DEFAULT_REFRESH, 60000);
    intervalRef.current = setInterval(doFetch, interval);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [feedUrl, refreshInterval, maxItems]);

  // Handle Rotation for Fade mode
  useEffect(() => {
    if (mode === 'fade' && news && news.items && news.items.length > 1) {
      if (rotationRef.current) clearInterval(rotationRef.current);
      rotationRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % news.items.length);
      }, Math.max(rotationSpeed, 2000));
    }
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [mode, news, rotationSpeed]);

  if (!feedUrl || (!news && !error)) return null;

  const posStyle = POSITION_MAP[position] || POSITION_MAP['bottom-center'];
  const isGlobalBar = position === 'bottom-bar';

  return (
    <>
      <style>{`
        @keyframes news-widget-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .news-widget-enter {
          animation: news-widget-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        @keyframes news-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-news-marquee {
          display: inline-block;
          white-space: nowrap;
          padding-left: 100%;
          animation: news-marquee linear infinite;
        }
        
        .news-fade-item {
          transition: opacity 0.5s ease-in-out;
        }
      `}</style>

      <div
        className={visible ? 'news-widget-enter' : ''}
        style={{
          position: 'absolute',
          ...posStyle,
          zIndex: 60,
          pointerEvents: 'none',
          background: isGlobalBar ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: isGlobalBar ? '0px' : '14px',
          padding: isGlobalBar ? '16px 24px' : '18px 26px',
          color: '#fff',
          fontFamily: "'Inter', 'Roboto', 'Segoe UI', sans-serif",
          borderTop: isGlobalBar ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderBottom: isGlobalBar ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          borderLeft: isGlobalBar ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRight: isGlobalBar ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
          opacity: visible ? 1 : 0,
          maxWidth: isGlobalBar ? '100%' : (showImages ? '900px' : '800px'),
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {error ? (
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Erro ao carregar notícias
          </div>
        ) : news && news.items && news.items.length > 0 ? (
          <>
            <div style={{
              fontWeight: 800,
              fontSize: '14px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              paddingRight: '16px',
              marginRight: '16px',
              borderRight: '1px solid rgba(255,255,255,0.2)',
              color: '#10b981', // green-500
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>
              Últimas Notícias
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', height: showImages ? '80px' : '24px' }}>
              {mode === 'marquee' ? (
                /* Marquee Mode */
                <div style={{ whiteSpace: 'nowrap', position: 'absolute', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                  <div 
                    className="animate-news-marquee" 
                    style={{ animationDuration: `${Math.max(10, news.items.length * (28 - (marqueeSpeed * 2)))}s` }}
                  >
                    {news.items.map((item, i) => (
                      <span key={i} style={{ paddingRight: '120px', display: 'inline-flex', alignItems: 'center', gap: '14px' }}>
                        {showImages && item.image && (
                          <img src={item.image} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} alt="" />
                        )}
                        <span>
                          <strong style={{ opacity: 0.9, fontSize: '16px' }}>{item.title}</strong>
                          {item.description && <span style={{ opacity: 0.6, marginLeft: '12px', fontSize: '14px' }}>- {item.description}</span>}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                /* Fade Mode */
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                  {news.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="news-fade-item"
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        opacity: currentIndex === idx ? 1 : 0,
                        visibility: currentIndex === idx ? 'visible' : 'hidden',
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center'
                      }}
                    >
                      {showImages && item.image && (
                        <img src={item.image} style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} alt="" />
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                        <strong style={{ fontSize: '16px', fontWeight: 600, opacity: 0.9, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.title}
                        </strong>
                        {item.description && (
                          <span style={{ fontSize: '14px', opacity: 0.6, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            — {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Nenhuma notícia encontrada.
          </div>
        )}
      </div>
    </>
  );
};

export default NewsWidget;
