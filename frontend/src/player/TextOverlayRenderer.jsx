import { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api';
import {
  AlertCircle, CheckCircle, Info, Star, Heart, Flame, Zap, Bell, Shield, ThumbsUp, Type
} from 'lucide-react';
import TemplateRenderer from './TemplateRenderer';

const MEDIA_BASE = API_BASE;

const LUCIDE_ICONS_MAP = {
  AlertCircle, CheckCircle, Info, Star, Heart, Flame, Zap, Bell, Shield, ThumbsUp
};

const TV_WIDTH = 1920;
const TV_HEIGHT = 1080;

const getAnimationStyle = (animation) => {
  switch (animation) {
    case 'marquee': return { animation: 'overlay-marquee 8s linear infinite' };
    case 'fade-in': return { animation: 'overlay-fade-in 2s ease forwards' };
    case 'typewriter': return { animation: 'overlay-typewriter 3s steps(40) forwards', overflow: 'hidden', whiteSpace: 'nowrap' };
    case 'bounce': return { animation: 'overlay-bounce 1s ease' };
    case 'slide-up': return { animation: 'overlay-slide-up 0.8s ease-out forwards' };
    case 'slide-down': return { animation: 'overlay-slide-down 0.8s ease-out forwards' };
    case 'slide-left': return { animation: 'overlay-slide-left 0.8s ease-out forwards' };
    case 'slide-right': return { animation: 'overlay-slide-right 0.8s ease-out forwards' };
    case 'zoom-in': return { animation: 'overlay-zoom-in 0.8s ease-out forwards' };
    case 'zoom-out': return { animation: 'overlay-zoom-out 0.8s ease-out forwards' };
    case 'flip': return { animation: 'overlay-flip 1s ease-out forwards' };
    case 'wobble': return { animation: 'overlay-wobble 1s ease-in-out infinite' };
    case 'pulse': return { animation: 'overlay-pulse 2s ease-in-out infinite' };
    case 'glow': return { animation: 'overlay-glow 2s ease-in-out infinite' };
    default: return {};
  }
};

const OverlayItem = ({ overlay }) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    if (overlay.duration_seconds > 0) {
      timerRef.current = setTimeout(() => {
        setVisible(false);
      }, overlay.duration_seconds * 1000);
      
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [overlay.duration_seconds, overlay.id]);

  if (!visible) return null;

  // ── TEMPLATE OVERLAY: fills the full player area ──────────────────────────
  // TemplateRenderer uses pixel-based positions (1920×1080 space), so it needs
  // a container that covers 100% of the player. We bypass the point-position
  // system and overlay the entire area.
  if (overlay.template_id) {
    const data = (() => {
      try {
        return typeof overlay.data_json === 'string'
          ? JSON.parse(overlay.data_json || '{}')
          : (overlay.data_json || {});
      } catch {
        return {};
      }
    })();

    const animation = overlay.animation && overlay.animation !== 'none'
      ? getAnimationStyle(overlay.animation)
      : {};

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 50,
          pointerEvents: 'none',
          ...animation,
        }}
      >
        <TemplateRenderer layout={overlay.template_layout} data={data} />
      </div>
    );
  }

  // ── LEGACY OVERLAY: text / icon / image positioned at a point ─────────────
  const hasText = overlay.text && overlay.text.trim();
  const hasImage = !!overlay.image_path;
  const hasIcon = !!overlay.icon_name;
  
  const IconComponent = overlay.icon_name ? LUCIDE_ICONS_MAP[overlay.icon_name] : null;

  const pctX = ((overlay.pos_x ?? 960) / TV_WIDTH) * 100;
  const pctY = ((overlay.pos_y ?? 540) / TV_HEIGHT) * 100;

  const wrapperStyle = {
    position: 'absolute',
    left: `${pctX}%`,
    top: `${pctY}%`,
    transform: `translate(-${pctX}%, -${pctY}%)`,
    zIndex: 50,
    pointerEvents: 'none',
    width: 'max-content'
  };

  const containerStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    fontSize: `${overlay.font_size}px`,
    fontFamily: overlay.font_family || 'Roboto',
    color: overlay.font_color || '#FFFFFF',
    backgroundColor: (hasText || hasIcon) ? (overlay.bg_color || 'transparent') : 'transparent',
    fontWeight: overlay.font_weight || 'normal',
    textShadow: overlay.text_shadow ? '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' : 'none',
    border: overlay.border ? '1px solid rgba(255,255,255,0.2)' : 'none',
    backdropFilter: overlay.bg_blur ? 'blur(8px)' : 'none',
    WebkitBackdropFilter: overlay.bg_blur ? 'blur(8px)' : 'none',
    padding: (hasText || hasIcon) ? '16px 32px' : '4px',
    lineHeight: 1.2,
    whiteSpace: 'pre-wrap',
    ...getAnimationStyle(overlay.animation),
  };

  const imageStyle = {
    height: `${overlay.image_size || 150}px`,
    width: 'auto',
    objectFit: 'contain',
    flexShrink: 0,
  };

  return (
    <div style={wrapperStyle}>
      <div style={containerStyle}>
        {IconComponent && (
          <IconComponent size={overlay.icon_size || 40} color={overlay.icon_color || '#FFFFFF'} style={{ flexShrink: 0 }} />
        )}
        {hasImage && (
          <img
            src={MEDIA_BASE + overlay.image_path}
            alt=""
            style={imageStyle}
          />
        )}
        {hasText && <span>{overlay.text}</span>}
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
