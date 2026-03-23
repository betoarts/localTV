import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getDevices, getMedia, getPlaylists, API_BASE } from '../api';
import { LayoutDashboard, Film, MonitorPlay, RadioReceiver, Activity, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

const SOCKET_URL = API_BASE || undefined;
const MEDIA_BASE = API_BASE;

const Dashboard = () => {
  const [stats, setStats] = useState({ devices: 0, media: 0, playlists: 0 });
  const [devices, setDevices] = useState([]);
  const [playbacks, setPlaybacks] = useState({});

  useEffect(() => {
    Promise.all([getDevices(), getMedia(), getPlaylists()]).then(
      ([devicesData, media, playlists]) => {
        setStats({
          devices: devicesData.length,
          media: media.length,
          playlists: playlists.length,
        });
        setDevices(devicesData);
      }
    ).catch(console.error);
    
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      socket.emit('request_dashboard');
    });
    
    socket.on('dashboard_update', (activePlaybacks) => {
      setPlaybacks(activePlaybacks);
    });
    
    socket.on('devices_updated', () => {
      getDevices().then(setDevices).catch(console.error);
    });

    return () => socket.disconnect();
  }, []);

  const cards = [
    { title: 'Registered_Devices', value: stats.devices, icon: <RadioReceiver size={24} />, link: '/admin/devices', activeColor: 'group-hover:text-cyan-400', activeBorder: 'hover:border-cyan-500' },
    { title: 'Media_Assets', value: stats.media, icon: <Film size={24} />, link: '/admin/media', activeColor: 'group-hover:text-fuchsia-500', activeBorder: 'hover:border-fuchsia-500' },
    { title: 'Active_Targets', value: stats.playlists, icon: <MonitorPlay size={24} />, link: '/admin/playlists', activeColor: 'group-hover:text-green-500', activeBorder: 'hover:border-green-500' },
  ];

  return (
    <div className="font-mono text-neutral-300 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-8 border-b border-neutral-800 pb-4 shrink-0">
        <LayoutDashboard className="text-green-500" size={28} />
        <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
          Sys_Dashboard
        </h2>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Activity size={14} className="text-green-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          <span className="text-green-500">REALTIME_METRICS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 shrink-0">
        {cards.map((card, idx) => (
          <Link to={card.link} key={idx} className="block group">
            <div className={`bg-[#0a0a0a] p-6 border border-neutral-800 transition-all duration-300 relative overflow-hidden ${card.activeBorder}`}>
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 bg-[#050505] border border-neutral-800 text-neutral-500 transition-colors ${card.activeColor}`}>
                  {card.icon}
                </div>
                <div className="text-[10px] text-neutral-600 uppercase tracking-widest border border-neutral-800 px-2 py-1">
                  MODULE_0{idx + 1}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">{card.title}</p>
                <p className="text-4xl font-bold text-neutral-100 tracking-tighter">
                  {String(card.value).padStart(2, '0')}
                </p>
              </div>
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-neutral-500 opacity-50" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-neutral-500 opacity-50" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-neutral-500 opacity-50" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-neutral-500 opacity-50" />
            </div>
          </Link>
        ))}
      </div>

      <h3 className="text-sm font-bold tracking-widest text-neutral-500 uppercase mb-4 border-b border-neutral-800 pb-2 flex items-center gap-2 shrink-0">
        <Activity size={16} className="text-cyan-500" />
        Live_Feed_Monitors
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 flex-1 pb-4">
        {devices.map((device) => {
          const isOnline = device.status === 'online';
          const lastSeenTime = new Date(device.last_seen).getTime();
          const isProbablyOffline = Date.now() - lastSeenTime > 5 * 60 * 1000;
          const actualStatus = isOnline && !isProbablyOffline ? 'Online' : 'Offline';
          
          const currentMedia = playbacks[device.id];
          const hasFeed = actualStatus === 'Online' && currentMedia;

          return (
            <div key={device.id} className="bg-[#0a0a0a] border border-neutral-800 flex flex-col overflow-hidden relative group">
               {/* Header */}
               <div className="p-3 border-b border-neutral-800 bg-[#050505] flex justify-between items-center z-10 transition-colors group-hover:border-cyan-500/50">
                 <div className="flex items-center gap-2 truncate">
                   <div className={`w-2 h-2 shrink-0 ${actualStatus === 'Online' ? 'bg-cyan-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : 'bg-red-500'}`} />
                   <span className="text-xs font-bold text-neutral-200 uppercase truncate" title={device.name}>{device.name}</span>
                 </div>
                 <span className="text-[9px] text-neutral-600 border border-neutral-800 px-1 font-mono shrink-0">ID:{String(device.id).substring(0,6)}</span>
               </div>
               
               {/* Preview Window */}
               <div className="h-40 bg-[#050505] relative flex items-center justify-center overflow-hidden">
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-10" />
                 
                 {hasFeed ? (
                   <>
                     {currentMedia.type === 'video' ? (
                        <video 
                          src={`${MEDIA_BASE}${currentMedia.path}`}
                          className="w-full h-full object-cover opacity-80 mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-700"
                          autoPlay
                          muted
                          loop
                          playsInline
                        />
                     ) : (
                        <div 
                          className="w-full h-full bg-cover bg-center opacity-80 mix-blend-screen scale-105 group-hover:scale-100 transition-transform duration-700" 
                          style={{ backgroundImage: `url(${MEDIA_BASE}${currentMedia.path})` }} 
                        />
                     )}
                     
                     {/* Overlay Meta */}
                     <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-[#050505] to-transparent z-20 flex justify-between items-end border-t border-black/50">
                       <span className="text-[10px] text-cyan-400 uppercase truncate font-bold drop-shadow-md pr-2">
                         {currentMedia.name}
                       </span>
                       {currentMedia.type === 'video' ? <VideoIcon size={12} className="text-cyan-500 shrink-0 opacity-80" /> : <ImageIcon size={12} className="text-cyan-500 shrink-0 opacity-80" />}
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center text-neutral-600 z-10 w-full px-4 text-center">
                     <RadioReceiver size={32} className={`mb-2 ${device.is_playing === 0 ? 'opacity-50 text-yellow-500' : 'opacity-30'}`} />
                     <span className="text-[10px] uppercase tracking-widest leading-relaxed">
                       {actualStatus === 'Online' 
                         ? (device.is_playing === 0 ? 'STANDBY_MODE (PAUSED)' : 'NO_ACTIVE_PLAYLIST') 
                         : 'FEED_LOST'}
                     </span>
                   </div>
                 )}
               </div>
               
               {/* Bottom Accent */}
               <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${actualStatus === 'Online' ? 'bg-cyan-500 opacity-50 group-hover:opacity-100' : 'bg-red-500/50'}`} />
            </div>
          );
        })}
        {devices.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center text-neutral-600 border border-neutral-800 border-dashed py-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
            <RadioReceiver size={40} className="mb-3 opacity-30 relative z-10" />
            <span className="text-sm uppercase font-bold tracking-widest text-neutral-500 relative z-10">NO_MONITORS_LINKED</span>
            <span className="text-[10px] tracking-widest mt-1 text-neutral-600 relative z-10">WAITING FOR REGISTER_DEVICE CALL</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
