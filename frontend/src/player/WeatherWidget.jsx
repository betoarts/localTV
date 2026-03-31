import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api';

const API_URL = `${API_BASE}/api`;

// WMO Weather Code → Icon + Label (pt-BR)
const getWeatherInfo = (code) => {
  if (code == null) return { icon: '—', label: '' };
  if (code === 0) return { icon: '☀️', label: 'Céu limpo' };
  if (code === 1) return { icon: '🌤️', label: 'Parcialmente limpo' };
  if (code === 2) return { icon: '⛅', label: 'Parcialmente nublado' };
  if (code === 3) return { icon: '☁️', label: 'Nublado' };
  if (code <= 48) return { icon: '🌫️', label: 'Nevoeiro' };
  if (code <= 57) return { icon: '🌦️', label: 'Garoa' };
  if (code <= 67) return { icon: '🌧️', label: 'Chuva' };
  if (code <= 77) return { icon: '❄️', label: 'Neve' };
  if (code <= 82) return { icon: '🌧️', label: 'Pancadas de chuva' };
  if (code <= 86) return { icon: '🌨️', label: 'Neve' };
  return { icon: '⛈️', label: 'Tempestade' };
};

const POSITION_MAP = {
  'top-right':     { top: '3%', right: '2%' },
  'top-left':      { top: '3%', left: '2%' },
  'bottom-right':  { bottom: '3%', right: '2%' },
  'bottom-left':   { bottom: '3%', left: '2%' },
  'top-center':    { top: '3%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-center': { bottom: '3%', left: '50%', transform: 'translateX(-50%)' },
};

const DEFAULT_CITY = 'Canela,RS';
const DEFAULT_REFRESH = 600000; // 10 minutes

const WeatherWidget = ({
  city = DEFAULT_CITY,
  position = 'top-right',
  refreshInterval = DEFAULT_REFRESH,
  showCondition = false,
  showHumidity = false,
  showFeelsLike = false,
  showWind = false,
}) => {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(false);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const hasShownRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hasShownRef.current = false;
    setVisible(false);

    const doFetch = async () => {
      try {
        const res = await fetch(`${API_URL}/weather?city=${encodeURIComponent(city || DEFAULT_CITY)}`);
        if (cancelled) return;
        if (!res.ok) {
          setError(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setWeather(data);
        setError(false);
        if (!hasShownRef.current) {
          hasShownRef.current = true;
          setTimeout(() => { if (!cancelled) setVisible(true); }, 50);
        }
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
  }, [city, refreshInterval]);

  // Nothing to show yet — graceful degradation
  if (!weather && !error) return null;

  const posStyle = POSITION_MAP[position] || POSITION_MAP['top-right'];
  const info = getWeatherInfo(weather?.weatherCode);
  const hasExtras = showCondition || showHumidity || showFeelsLike || showWind;
  const displayRegion = weather?.region || '';

  return (
    <>
      <style>{`
        @keyframes weather-widget-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .weather-widget-enter {
          animation: weather-widget-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div
        className={visible ? 'weather-widget-enter' : ''}
        style={{
          position: 'absolute',
          ...posStyle,
          zIndex: 60,
          pointerEvents: 'none',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '14px',
          padding: '18px 26px',
          color: '#fff',
          fontFamily: "'Inter', 'Roboto', 'Segoe UI', sans-serif",
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
          opacity: visible ? 1 : 0,
          minWidth: '140px',
        }}
      >
        {error ? (
          <div style={{ fontSize: '14px', opacity: 0.7 }}>
            Cidade não encontrada
          </div>
        ) : weather ? (
          <>
            {/* Main Row: Icon + Temperature */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              lineHeight: 1,
            }}>
              <span style={{ fontSize: '38px', lineHeight: 1 }}>
                {info.icon}
              </span>
              <span style={{
                fontSize: '42px',
                fontWeight: 700,
                letterSpacing: '-1.5px',
                lineHeight: 1,
              }}>
                {weather.temperature}
                <span style={{ fontSize: '22px', fontWeight: 400, opacity: 0.7 }}>°C</span>
              </span>
            </div>

            {/* Condition Text (optional) */}
            {showCondition && info.label && (
              <div style={{
                fontSize: '14px',
                opacity: 0.65,
                marginTop: '6px',
                fontWeight: 500,
                letterSpacing: '0.3px',
              }}>
                {info.label}
              </div>
            )}

            {/* Extra Details Row (optional) */}
            {hasExtras && (showHumidity || showFeelsLike || showWind) && (
              <div style={{
                display: 'flex',
                gap: '14px',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                fontSize: '13px',
                opacity: 0.6,
                fontWeight: 400,
              }}>
                {showHumidity && weather.humidity != null && (
                  <span>💧 {weather.humidity}%</span>
                )}
                {showFeelsLike && weather.feelsLike != null && (
                  <span>🌡️ {weather.feelsLike}°</span>
                )}
                {showWind && weather.windSpeed != null && (
                  <span>💨 {weather.windSpeed} km/h</span>
                )}
              </div>
            )}

            {/* City Label */}
            <div style={{
              fontSize: '13px',
              opacity: 0.5,
              marginTop: hasExtras ? '6px' : '8px',
              fontWeight: 400,
              letterSpacing: '0.4px',
            }}>
              {weather.city}{displayRegion ? `, ${displayRegion}` : ''}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};

export default WeatherWidget;
