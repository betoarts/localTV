import { useState, useEffect, useRef } from 'react';
import { getMedia, uploadMedia, deleteMedia } from '../api';
import { UploadCloud, Trash2, Image as ImageIcon, Video as VideoIcon, Film, Activity } from 'lucide-react';

const MediaLibrary = () => {
  const [media, setMedia] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = () => {
    getMedia().then(setMedia).catch(console.error);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadMedia(file);
      loadMedia();
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('TERMINATE ASSET? This action cannot be reversed.')) return;
    try {
      await deleteMedia(id);
      loadMedia();
    } catch (err) {
      console.error(err);
      alert('Error deleting media');
    }
  };

  return (
    <div className="font-mono text-neutral-300 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3">
          <Film className="text-fuchsia-500" size={28} />
          <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
            Media_Library
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-xs mr-4">
            <Activity size={14} className={`text-fuchsia-500 ${uploading ? 'animate-spin' : ''}`} />
            <span className="text-fuchsia-500 uppercase">{uploading ? 'UPLOADING...' : 'AWAITING_DATA'}</span>
          </div>
          
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/mp4,video/webm"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-fuchsia-600/20 text-fuchsia-500 border border-fuchsia-600/50 hover:bg-fuchsia-500 hover:text-[#050505] px-4 py-2 transition-colors disabled:opacity-50 uppercase text-xs font-bold tracking-widest"
          >
            <UploadCloud size={16} />
            {uploading ? 'UPLOADING_DATA...' : 'INGEST_ASSET'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {media.map((item) => (
            <div key={item.id} className="bg-[#0a0a0a] border border-neutral-800 relative group transition-colors hover:border-fuchsia-500/50 flex flex-col h-full">
              <div className="h-40 bg-[#050505] flex items-center justify-center relative overflow-hidden border-b border-neutral-800">
                {/* Data Grid Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-10" />
                
                {item.type === 'video' ? (
                  <>
                    <video 
                      src={`http://${window.location.hostname}:3000${item.path}`}
                      className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity relative z-0 mix-blend-screen grayscale group-hover:grayscale-0"
                      preload="metadata"
                      muted
                      playsInline
                      loop
                      onMouseOver={(e) => { e.target.play().catch(() => {}); }}
                      onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                    <div className="absolute top-2 left-2 p-1 bg-[#050505]/80 border border-neutral-800 z-10 pointer-events-none">
                      <VideoIcon size={12} className="text-fuchsia-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                    </div>
                  </>
                ) : (
                  <div 
                    className="w-full h-full bg-cover bg-center opacity-70 group-hover:opacity-100 transition-opacity relative z-0 mix-blend-screen grayscale group-hover:grayscale-0 sequence-hover" 
                    style={{ backgroundImage: `url(http://${window.location.hostname}:3000${item.path})` }} 
                  />
                )}
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-[#050505] p-2 transition-all opacity-0 group-hover:opacity-100 z-20"
                  title="Terminate Asset"
                >
                  <Trash2 size={14} />
                </button>

                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-[#050505]/80 border border-neutral-800 text-[9px] uppercase tracking-widest text-fuchsia-500 z-20">
                  {item.type}
                </div>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between">
                <p className="text-xs font-medium text-neutral-300 truncate uppercase mt-1 mb-2" title={item.name}>
                  {item.name}
                </p>
                <div className="flex justify-between items-end border-t border-neutral-800 pt-2 mt-auto">
                  <p className="text-[10px] text-neutral-600 font-mono tracking-widest">
                    ID:{String(item.id).substring(0,6)}
                  </p>
                  <p className="text-[10px] bg-[#050505] border border-neutral-800 px-1 text-neutral-400 font-mono">
                    {item.type === 'image' ? '10s' : 'AUTO'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {media.length === 0 && !uploading && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-neutral-600 bg-[#0a0a0a] border border-neutral-800 border-dashed relative">
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
             <Film size={48} className="mb-4 opacity-30" />
             <p className="uppercase tracking-widest text-sm text-neutral-500">MEDIA_REPOSITORY_EMPTY</p>
             <p className="text-xs mt-2 uppercase">Awaiting ingested assets.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;
