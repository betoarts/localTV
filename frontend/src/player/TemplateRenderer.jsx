import React, { useMemo } from 'react';

const TemplateRenderer = ({ layout, data = {} }) => {
  const elements = useMemo(() => {
    try {
      if (typeof layout === 'string') {
        return JSON.parse(layout).elements || [];
      }
      return layout.elements || [];
    } catch (e) {
      console.error("Error parsing template layout:", e);
      return [];
    }
  }, [layout]);

  const replaceVariables = (content) => {
    if (typeof content !== 'string') return content;
    return content.replace(/{{(\w+)}}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  };

  const renderElement = (el, index) => {
    const style = {
      position: 'absolute',
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: el.width ? `${el.width}px` : 'auto',
      height: el.height ? `${el.height}px` : 'auto',
      zIndex: el.zIndex || index,
      color: el.color || 'inherit',
      fontSize: el.fontSize ? `${el.fontSize}px` : 'inherit',
      fontWeight: el.fontWeight || 'normal',
      textAlign: el.textAlign || 'left',
      backgroundColor: el.backgroundColor || 'transparent',
      borderRadius: el.borderRadius ? `${el.borderRadius}px` : '0',
      display: 'flex',
      alignItems: el.alignItems || 'flex-start',
      justifyContent: el.justifyContent || 'flex-start',
      overflow: 'hidden'
    };

    switch (el.type) {
      case 'rect':
        return (
          <div key={index} style={style} />
        );
      case 'text':
        return (
          <div key={index} style={style}>
            {replaceVariables(el.content)}
          </div>
        );
      case 'image':
        return (
          <div key={index} style={style}>
            <img 
              src={el.src} 
              alt="" 
              style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'cover' }} 
            />
          </div>
        );
      case 'video':
        return (
          <div key={index} style={style}>
            <video 
              src={el.src} 
              autoPlay 
              muted 
              loop 
              playsInline
              style={{ width: '100%', height: '100%', objectFit: el.objectFit || 'cover' }} 
            />
          </div>
        );
      case 'clock':
        return <ClockElement key={index} style={style} format={el.format} />;
      case 'ticker':
        return (
          <div key={index} style={{ ...style, whiteSpace: 'nowrap' }}>
            <div className="animate-marquee">
              {replaceVariables(el.content)}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-transparent">
      {elements.map((el, index) => renderElement(el, index))}
    </div>
  );
};

const ClockElement = ({ style, format = 'HH:mm:ss' }) => {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: format.includes('ss') ? '2-digit' : undefined,
    hour12: false 
  });

  return (
    <div style={style}>
      {formattedTime}
    </div>
  );
};

export default TemplateRenderer;
