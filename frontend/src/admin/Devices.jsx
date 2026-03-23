import { useState, useEffect } from 'react';
import { getDevices, createDevice, updateDevice, deleteDevice, getPlaylists } from '../api';
import { RadioReceiver, AlertCircle, Maximize2, Smartphone, Terminal, Activity, Trash2, Volume2, VolumeX, Square, Play, Edit2, Save, X } from 'lucide-react';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    loadDevices();
    getPlaylists().then(setPlaylists).catch(console.error);
    
    const interval = setInterval(loadDevices, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDevices = () => {
    getDevices().then(setDevices).catch(console.error);
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    try {
      await createDevice({ name: newDeviceName });
      setNewDeviceName('');
      loadDevices();
    } catch (err) {
      console.error(err);
      alert('Error creating device');
    }
  };

  const handleUpdateDevice = async (id, field, value) => {
    const d = devices.find(x => x.id === id);
    if (!d) return;
    try {
      await updateDevice(id, { ...d, [field]: value });
      loadDevices();
    } catch (err) {
      console.error(err);
      alert('Error updating device');
    }
  };

  const handleUpdateDeviceName = async (e, id) => {
    e.preventDefault();
    if (!editingName.trim()) {
      setEditingDeviceId(null);
      return;
    }
    await handleUpdateDevice(id, 'name', editingName);
    setEditingDeviceId(null);
  };

  const handleDeleteDevice = async (id) => {
    if (!window.confirm('TERMINATE DEVICE LINK? This action cannot be reversed.')) return;
    try {
      await deleteDevice(id);
      loadDevices();
    } catch (err) {
      console.error(err);
      alert('Error deleting device');
    }
  };

  return (
    <div className="font-mono text-neutral-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <RadioReceiver className="text-cyan-500" size={28} />
          <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
            Devices_Ctrl
          </h2>
        </div>
        
        <form onSubmit={handleCreateDevice} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
             <Terminal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
             <input
               type="text"
               value={newDeviceName}
               onChange={(e) => setNewDeviceName(e.target.value)}
               placeholder="NEW_DEVICE_ID"
               className="w-full bg-[#0a0a0a] border border-neutral-700 text-neutral-300 pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-cyan-500 transition-colors uppercase placeholder:text-neutral-600"
             />
          </div>
          <button
            type="submit"
            className="bg-cyan-600/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-[#050505] px-4 py-2 transition-colors uppercase text-xs font-bold tracking-widest shrink-0"
          >
            INIT_LINK
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {devices.map((device) => {
          const isOnline = device.status === 'online';
          const lastSeenTime = new Date(device.last_seen).getTime();
          const isProbablyOffline = Date.now() - lastSeenTime > 5 * 60 * 1000;
          const actualStatus = isOnline && !isProbablyOffline ? 'Online' : 'Offline';
          const statusColor = actualStatus === 'Online' ? 'text-green-500' : 'text-red-500';
          const statusBg = actualStatus === 'Online' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30';

          return (
            <div key={device.id} className="bg-[#0a0a0a] border border-neutral-800 flex flex-col relative overflow-hidden group hover:border-cyan-500/50 transition-colors">
              {/* Device Header */}
              <div className="p-4 border-b border-neutral-800 bg-[#050505] flex justify-between items-start group/header">
                <div className="flex-1 mr-4 overflow-hidden">
                  {editingDeviceId === device.id ? (
                    <form onSubmit={(e) => handleUpdateDeviceName(e, device.id)} className="flex items-center gap-1 mb-2">
                      <RadioReceiver size={16} className="text-cyan-500 shrink-0 hidden sm:block" />
                      <input 
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="bg-[#0a0a0a] border border-cyan-500/50 text-neutral-200 uppercase text-sm font-bold tracking-wider px-2 py-0.5 focus:outline-none focus:border-cyan-400 w-full"
                        autoFocus
                      />
                      <button type="submit" className="text-cyan-500 hover:text-cyan-400 p-1 bg-cyan-500/10 border border-cyan-500/30" title="Save"><Save size={14} /></button>
                      <button type="button" onClick={() => setEditingDeviceId(null)} className="text-neutral-500 hover:text-red-500 p-1 border border-transparent hover:border-red-500/30 hover:bg-red-500/10" title="Cancel"><X size={14} /></button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2 group-hover/header:bg-[#0a0a0a] transition-colors -ml-1 p-1 rounded-sm w-full">
                      <RadioReceiver size={16} className="text-cyan-500 shrink-0 hidden sm:block" />
                      <h3 className="font-bold text-neutral-200 tracking-wider uppercase truncate">
                        {device.name}
                      </h3>
                      <button 
                        onClick={() => { setEditingDeviceId(device.id); setEditingName(device.name); }}
                        className="text-neutral-600 hover:text-cyan-500 opacity-0 group-hover/header:opacity-100 transition-opacity p-1 ml-auto shrink-0"
                        title="Edit Device Name"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 items-center mt-1 ml-1">
                    <span className={`px-1.5 py-0.5 border text-[9px] uppercase tracking-widest flex items-center gap-1 ${statusBg} ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 bg-current ${actualStatus === 'Online' ? 'animate-pulse' : ''}`} />
                      {actualStatus}
                    </span>
                    <span className="text-[10px] text-neutral-600 border border-neutral-800 px-1 truncate max-w-[100px]" title={device.id}>
                      {String(device.id).substring(0,8)}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1 shrink-0 mt-1">
                  <a 
                    href={`/player/${device.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-neutral-800 hover:border-cyan-500 hover:bg-cyan-500 hover:text-[#050505] text-neutral-500 transition-colors"
                    title="Open Terminal Feed"
                  >
                     <Activity size={16} />
                  </a>
                  {device.is_playing === 0 ? (
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'is_playing', 1)}
                      className="p-2 border border-neutral-800 hover:border-green-500 hover:bg-green-500 hover:text-[#050505] text-green-500 transition-colors animate-pulse"
                      title="Start Transmission (Play Signal)"
                    >
                       <Play size={16} className="fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'is_playing', 0)}
                      className="p-2 border border-neutral-800 hover:border-yellow-500 hover:bg-yellow-500 hover:text-[#050505] text-neutral-500 transition-colors"
                      title="Stop Transmission (Cut Signal)"
                    >
                       <Square size={16} className="fill-current" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteDevice(device.id)}
                    className="p-2 border border-neutral-800 hover:border-red-500 hover:bg-red-500 hover:text-[#050505] text-neutral-500 transition-colors"
                    title="Terminate Device"
                  >
                     <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 space-y-4 bg-[#0a0a0a]">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    TARGET_FEED (PLAYLIST)
                  </label>
                  <select
                    value={device.playlist_id || ''}
                    onChange={(e) => handleUpdateDevice(device.id, 'playlist_id', e.target.value)}
                    className="w-full border border-neutral-700 bg-[#050505] text-neutral-300 px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500 uppercase cursor-pointer"
                  >
                    <option value="">[AWAITING_ASSIGNMENT]</option>
                    {playlists.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    DISPLAY_MATRIX
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'orientation', 'landscape')}
                      className={`flex-1 flex justify-center items-center gap-2 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                        device.orientation === 'landscape' 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                          : 'border-neutral-700 bg-[#050505] text-neutral-500 hover:border-neutral-500'
                      }`}
                    >
                      <Maximize2 size={12} /> 16:9 
                    </button>
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'orientation', 'portrait')}
                      className={`flex-1 flex justify-center items-center gap-2 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                        device.orientation === 'portrait' 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                          : 'border-neutral-700 bg-[#050505] text-neutral-500 hover:border-neutral-500'
                      }`}
                    >
                      <Smartphone size={12} /> 9:16
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    AUDIO_OUTPUT
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'muted', 0)}
                      className={`flex-1 flex justify-center items-center gap-2 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                        device.muted === 0 
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                          : 'border-neutral-700 bg-[#050505] text-neutral-500 hover:border-neutral-500'
                      }`}
                    >
                      <Volume2 size={12} /> ACTIVE
                    </button>
                    <button
                      onClick={() => handleUpdateDevice(device.id, 'muted', 1)}
                      className={`flex-1 flex justify-center items-center gap-2 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${
                        device.muted !== 0 
                          ? 'border-red-500 bg-red-500/10 text-red-500' 
                          : 'border-neutral-700 bg-[#050505] text-neutral-500 hover:border-neutral-500'
                      }`}
                    >
                      <VolumeX size={12} /> MUTED
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1">
                    TRANSITION_PROTOCOL
                  </label>
                  <select
                    value={device.transition || 'fade'}
                    onChange={(e) => handleUpdateDevice(device.id, 'transition', e.target.value)}
                    className="w-full border border-neutral-700 bg-[#050505] text-neutral-300 px-2 py-1.5 text-xs focus:outline-none focus:border-cyan-500 uppercase cursor-pointer"
                  >
                    <option value="none">INSTANT (NONE)</option>
                    <option value="fade">X-FADE (DEFAULT)</option>
                    <option value="slide">LATERAL SLIDE</option>
                    <option value="slide-up">VERTICAL SLIDE</option>
                    <option value="zoom">OPTICAL ZOOM</option>
                    <option value="blur">CAMERA FOCUS (BLUR)</option>
                    <option value="crt">CRT POWER ON</option>
                    <option value="glitch">CYBER GLITCH</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}

        {devices.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-600 bg-[#0a0a0a] border border-neutral-800 border-dashed relative">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
             <RadioReceiver size={48} className="mb-4 opacity-30" />
             <p className="uppercase tracking-widest text-sm text-neutral-500">NO_ACTIVE_LINKS</p>
             <p className="text-xs mt-2 uppercase">Awaiting device initialization.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Devices;
