import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getDevice, getPlaylistItems, getOverlaysByTarget, getPlaylistItemsOverlays, API_BASE } from '../api';
import TextOverlayRenderer from './TextOverlayRenderer';

const SOCKET_URL = API_BASE || undefined;
const MEDIA_BASE = API_BASE;

// Helper helpers - Static, moved outside to avoid re-allocation
const getResolutionDimensions = (res, isPortrait) => {
  switch(res) {
    case '720p': return isPortrait ? { width: 720, height: 1280 } : { width: 1280, height: 720 };
    case '1080p': return isPortrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
    case '4k': return isPortrait ? { width: 2160, height: 3840 } : { width: 3840, height: 2160 };
    default: return null;
  }
};

const getAnimationClass = (transition) => {
  switch (transition) {
    case 'fade': return 'animate-fade-in';
    case 'slide': return 'animate-slide-in';
    case 'slide-up': return 'animate-slide-up';
    case 'zoom': return 'animate-zoom-in';
    case 'blur': return 'animate-blur-in';
    case 'crt': return 'animate-crt-on';
    case 'glitch': return 'animate-glitch';
    case 'none': return '';
    default: return 'animate-fade-in';
  }
};

const Player = () => {

  const { deviceId } = useParams();
  const [device, setDevice] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playCount, setPlayCount] = useState(0);
  const [overlays, setOverlays] = useState([]);

  const socketRef = useRef(null);
  const itemsRef = useRef([]);
  const timeoutRef = useRef(null);
  const videoRef = useRef(null);

  const fetchOverlays = async (d) => {
    try {
      const deviceOverlays = await getOverlaysByTarget('device', deviceId);
      let playlistOverlays = [];
      if (d?.playlist_id) {
        playlistOverlays = await getPlaylistItemsOverlays(d.playlist_id);
      }
      setOverlays([...deviceOverlays, ...playlistOverlays]);
    } catch (err) {
      console.error('Failed to fetch overlays:', err);
    }
  };

  const fetchDeviceData = async () => {
    try {
      const d = await getDevice(deviceId);
      setDevice(d);

      if (d.playlist_id) {
        const plItems = await getPlaylistItems(d.playlist_id);
        setItems(plItems);
        itemsRef.current = plItems;
        setCurrentIndex((prev) => (prev >= plItems.length && plItems.length > 0 ? 0 : prev));
      } else {
        setItems([]);
        itemsRef.current = [];
      }

      setLoading(false);
      // Fetch overlays separately so failures don't break the player
      fetchOverlays(d);
    } catch (err) {
      console.error(err);
      setError('Could not load device configuration.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceData();

    socketRef.current = io(SOCKET_URL);
    
    socketRef.current.on('connect', () => {
      console.log('Connected to server');
      socketRef.current.emit('register_device', deviceId);
    });

    socketRef.current.on('command_update', (data) => {
      console.log('Received command update', data);
      fetchDeviceData();
    });

    socketRef.current.on('playlist_updated', (playlistId) => {
      setDevice(prev => {
        if (prev && prev.playlist_id == playlistId) {
          fetchDeviceData();
        }
        return prev;
      });
    });

    socketRef.current.on('overlays_updated', () => {
      setDevice(prev => {
        fetchOverlays(prev);
        return prev;
      });
    });

    return () => {
      socketRef.current.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [deviceId]);

  const handleNextItem = () => {
    setPlayCount(c => c + 1);
    setCurrentIndex(prev => {
      const len = itemsRef.current.length;
      if (len === 0) return 0;
      return (prev + 1) % len;
    });
  };

  useEffect(() => {
    if (items.length === 0 || device?.is_playing === 0) {
      if (socketRef.current) {
        socketRef.current.emit('now_playing', { deviceId, media: null });
      }
      return;
    }

    const currentItem = items[currentIndex];
    
    // Broadcast current playing item to Dashboard
    if (socketRef.current) {
      socketRef.current.emit('now_playing', { deviceId, media: currentItem });
    }
    
    if (currentItem.type === 'image') {
      const waitTime = (currentItem.duration || currentItem.default_duration || 10) * 1000;
      
      timeoutRef.current = setTimeout(() => {
        handleNextItem();
      }, waitTime);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, items, playCount, deviceId, device?.is_playing]);

  const currentItemRef = items[currentIndex];

  useEffect(() => {
    if (videoRef.current && currentItemRef?.type === 'video') {
      const isMuted = device?.muted !== 0;
      videoRef.current.muted = isMuted;
      videoRef.current.defaultMuted = isMuted;
      
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Playback blocked:', err);
          if (!isMuted) {
            // Browser blocked audio autoplay, fallback to muted to prevent freezing
            videoRef.current.muted = true;
            videoRef.current.play().catch(e => {
              console.error('Playback completely blocked:', e);
              // Force next slide to prevent playlist from freezing forever
              handleNextItem();
            });
          } else {
             // Blocked even if muted - force next slide
             handleNextItem();
          }
        });
      }
    }
  }, [currentIndex, playCount, currentItemRef, device?.muted]);

  const handleVideoEnded = () => handleNextItem();
  const handleVideoError = () => handleNextItem();

  const handleStartFullscreen = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    }
  };

  const currentItem = items[currentIndex];
  const nextIndex = items.length > 0 ? (currentIndex + 1) % items.length : 0;
  const nextItem = items[nextIndex];
  const isPortrait = device?.orientation === 'portrait';

  const resDims = useMemo(() => 
    getResolutionDimensions(device?.resolution, isPortrait), 
  [device?.resolution, isPortrait]);

  const wrapperStyles = useMemo(() => {
    if (!resDims) return {};
    const { width, height } = resDims;
    if (isPortrait) {
      const scale = `min(calc(100vw / ${height}), calc(100vh / ${width}))`;
      return {
        width: `${width}px`,
        height: `${height}px`,
        transform: `rotate(-90deg) scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
      };
    } else {
      const scale = `min(calc(100vw / ${width}), calc(100vh / ${height}))`;
      return {
        width: `${width}px`,
        height: `${height}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
      };
    }
  }, [resDims, isPortrait]);

  const transitionClass = useMemo(() => 
    getAnimationClass(device?.transition), 
  [device?.transition]);

  const activeOverlays = useMemo(() => {
    if (!currentItem) return overlays.filter(o => o.target_type === 'device');
    return overlays.filter(o => 
      o.target_type === 'device' || 
      (o.target_type === 'playlist_item' && o.target_id === currentItem.id)
    );
  }, [overlays, currentItem]);

  if (loading) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-cyan-500 font-mono animate-pulse overflow-hidden">
      <style>{`html, body { overflow: hidden !important; background-color: black !important; margin: 0; padding: 0; }`}</style>
      Establishing Link...
    </div>;
  }

  if (error) {
    return <div className="fixed inset-0 bg-black flex items-center justify-center text-red-500 text-2xl font-mono overflow-hidden">
      <style>{`html, body { overflow: hidden !important; background-color: black !important; margin: 0; padding: 0; }`}</style>
      {error}
    </div>;
  }

  if (items.length === 0 || device?.is_playing === 0) {
    return <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white font-mono text-center px-4 cursor-pointer hover:bg-[#0a0a0a] transition-colors overflow-hidden" onClick={handleStartFullscreen}>
      <style>{`html, body { overflow: hidden !important; background-color: black !important; margin: 0; padding: 0; }`}</style>
      <p className="text-5xl md:text-7xl mb-6 font-bold tracking-[0.1em] text-white/90 drop-shadow-lg">
        NO SIGNAL
      </p>
      <p className="text-xl md:text-2xl tracking-widest text-white/80">
        {device?.is_playing === 0 ? 'TRANSMISSION STOPPED' : 'AWAITING ASSIGNMENT'}
      </p>
      <p className="text-sm mt-4 text-white/50 tracking-wider">
        TARGET: {device?.name || deviceId}
      </p>
      <p className="text-[10px] mt-12 text-white/30 uppercase tracking-[0.3em] animate-pulse">
        [ CLICK ANYWHERE TO ENTER FULLSCREEN ]
      </p>
    </div>;
  }


  return (
    <div className="fixed inset-0 bg-black overflow-hidden cursor-pointer flex items-center justify-center" onClick={handleStartFullscreen}>
      <style>{`html, body { overflow: hidden !important; background-color: black !important; margin: 0; padding: 0; touch-action: none; } * { cursor: none !important; user-select: none; }`}</style>
      <div 
        className={`flex items-center justify-center ${
          resDims 
            ? '' 
            : 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ' + (isPortrait ? 'w-[100vh] h-[100vw] -rotate-90' : 'w-full h-full')
        }`}
        style={wrapperStyles}
      >



        
        {currentItem.type === 'video' ? (
          <video
            key={`media-${currentIndex}-${playCount}`}
            ref={videoRef}
            src={MEDIA_BASE + currentItem.path}
            className={`w-full h-full ${resDims ? 'object-contain' : 'object-cover'} ${transitionClass}`}
            autoPlay
            playsInline
            muted={device?.muted !== 0} 
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />

        ) : (
          <img 
            key={`media-${currentIndex}-${playCount}`}
            src={MEDIA_BASE + currentItem.path} 
            alt="signage" 
            className={`w-full h-full ${resDims ? 'object-contain' : 'object-cover'} ${transitionClass}`}
          />

        )}

        {/* Text Overlays */}
        <TextOverlayRenderer overlays={activeOverlays} />

        {/* Predictive Preloading - Hidden from view, but warms up browser cache */}
        {nextItem && nextItem.id !== currentItem.id && (
          <div className="hidden pointer-events-none w-0 h-0 overflow-hidden" aria-hidden="true">
            {nextItem.type === 'video' ? (
              <video src={MEDIA_BASE + nextItem.path} preload="auto" muted />
            ) : (
              <img src={MEDIA_BASE + nextItem.path} loading="eager" alt="" />
            )}
          </div>
        )}
      </div>
    </div>

  );
};

export default Player;
