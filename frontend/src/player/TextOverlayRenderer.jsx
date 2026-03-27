import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api';
import TemplateRenderer from './TemplateRenderer';

const MEDIA_BASE = API_BASE;

const getPositionClasses = (position) => {
  switch (position) {
    case 'top-bar':
      return 'top-0 left-0 right-0';
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'center':
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'bottom-bar':
      return 'bottom-0 left-0 right-0';
    default:
      return 'bottom-0 left-0 right-0';
  }
};

const getAnimationStyle = (animation) => {
  switch (animation) {
    case 'marquee':
      return { animation: 'overlay-marquee 12s linear infinite' };
    case 'fade-in':
      return { animation: 'overlay-fade-in 2s ease forwards' };
    case 'typewriter':
      return { animation: 'overlay-typewriter 3s steps(40) forwards', overflow: 'hidden', whiteSpace: 'nowrap', borderRight: '2px solid rgba(255,255,255,0.7)' };
    case 'bounce':
      return { animation: 'overlay-bounce 1s ease' };
    case 'slide-up':
      return { animation: 'overlay-slide-up 0.8s ease-out forwards' };
    case 'slide-down':
      return { animation: 'overlay-slide-down 0.8s ease-out forwards' };
    case 'pulse':
      return { animation: 'overlay-pulse 2s ease-in-out infinite' };
    case 'glow':
      return { animation: 'overlay-glow 2s ease-in-out infinite' };
    default:
      return {};
  }
};

const OverlayItem = ({ overlay }) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (overlay.duration_seconds > 0) {
      const cycle = () => {
        setVisible(true);
        timerRef.current = setTimeout(() => {
          setVisible(false);
          timerRef.current = setTimeout(() => {
            cycle();
          }, 2000);
        }, overlay.duration_seconds * 1000);
      };
      cycle();
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [overlay.duration_seconds]);

  if (!visible) return null;

  const hasText = overlay.text && overlay.text.trim();
  const hasImage = overlay.image_path;
  const isBar = overlay.position === 'top-bar' || overlay.position === 'bottom-bar';

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: `${overlay.font_size}px`,
    color: overlay.font_color || '#FFFFFF',
    backgroundColor: hasText ? (overlay.bg_color || 'rgba(0,0,0,0.5)') : 'transparent',
    fontWeight: overlay.font_weight || 'normal',
    textShadow: overlay.text_shadow ? '0 0 12px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.6)' : 'none',
    border: overlay.border ? '1px solid rgba(255,255,255,0.15)' : 'none',
    backdropFilter: overlay.bg_blur ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: overlay.bg_blur ? 'blur(12px)' : 'none',
    padding: hasText ? (isBar ? '8px 16px' : '6px 14px') : '4px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: 1.3,
    ...getAnimationStyle(overlay.animation),
  };

  const imageStyle = {
    height: `${overlay.image_size || 100}px`,
    width: 'auto',
    objectFit: 'contain',
    flexShrink: 0,
  };

  const content = (
    <>
      {overlay.template_id ? (
        <div style={{ width: '100%', height: '100%' }}>
          <TemplateRenderer 
            layout={overlay.template_layout} 
            data={(() => {
              try {
                return typeof overlay.data_json === 'string' ? JSON.parse(overlay.data_json || '{}') : (overlay.data_json || {});
              } catch (e) {
                console.error("Error parsing overlay data_json:", e);
                return {};
              }
            })()} 
          />
        </div>
      ) : (
        <>
          {hasImage && (
            <img
              src={MEDIA_BASE + overlay.image_path}
              alt=""
              style={imageStyle}
            />
          )}
          {hasText && overlay.text}
        </>
      )}
    </>
  );

  if (isBar && overlay.animation === 'marquee') {
    return (
      <div className={`absolute ${getPositionClasses(overlay.position)} overflow-hidden z-50`}>
        <div style={{ ...containerStyle, display: 'inline-flex', whiteSpace: 'nowrap', paddingLeft: '100%' }}>
          {content}
        </div>
      </div>
    );
  }

  const positionClasses = overlay.template_id 
    ? 'inset-0' 
    : getPositionClasses(overlay.position);

  return (
    <div className={`absolute ${positionClasses} z-50 ${overlay.template_id ? 'pointer-events-none' : ''}`}>
      <div style={overlay.template_id ? { width: '100%', height: '100%' } : containerStyle}>
        {content}
      </div>
    </div>
  );
};

const TextOverlayRenderer = ({ overlays = [] }) => {
  if (overlays.length === 0) return null;

  return (
    <>
      {overlays.map(overlay => (
        <OverlayItem key={overlay.id} overlay={overlay} />
      ))}
    </>
  );
};

export default TextOverlayRenderer;
