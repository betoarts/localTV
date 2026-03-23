import { useState, useEffect } from 'react';
import { getPlaylists, createPlaylist, updatePlaylist, deletePlaylist, getMedia, getPlaylistItems, addPlaylistItem, removePlaylistItem, reorderPlaylistItems } from '../api';
import { Plus, Trash2, GripVertical, Terminal, MonitorPlay, Database, Activity, Edit2, Save, X } from 'lucide-react';

const Playlists = () => {
  const [playlists, setPlaylists] = useState([]);
  const [media, setMedia] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistItems, setPlaylistItems] = useState([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  useEffect(() => {
    loadPlaylists();
    getMedia().then(setMedia).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedPlaylistId) {
      loadPlaylistItems(selectedPlaylistId);
    } else {
      setPlaylistItems([]);
    }
  }, [selectedPlaylistId]);

  const loadPlaylists = () => {
    getPlaylists().then(data => {
      setPlaylists(data);
      if (data.length > 0 && !selectedPlaylistId) {
        setSelectedPlaylistId(data[0].id);
      }
    }).catch(console.error);
  };

  const loadPlaylistItems = (id) => {
    getPlaylistItems(id).then(setPlaylistItems).catch(console.error);
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    try {
      const p = await createPlaylist(newPlaylistName);
      setNewPlaylistName('');
      loadPlaylists();
      setSelectedPlaylistId(p.id);
    } catch (err) {
      console.error(err);
      alert('Error creating playlist');
    }
  };

  const handleAddMediaToPlaylist = async (mediaId) => {
    if (!selectedPlaylistId) return;
    try {
      await addPlaylistItem(selectedPlaylistId, {
        media_id: mediaId,
        item_order: playlistItems.length + 1,
        duration: null
      });
      loadPlaylistItems(selectedPlaylistId);
    } catch (err) {
      console.error(err);
      alert('Error adding media');
    }
  };

  const handleRemoveItem = async (itemId) => {
    try {
      await removePlaylistItem(selectedPlaylistId, itemId);
      loadPlaylistItems(selectedPlaylistId);
    } catch (err) {
      console.error(err);
      alert('Error removing item');
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    
    const itemsCopy = [...playlistItems];
    const draggedItem = itemsCopy[draggedItemIndex];
    itemsCopy.splice(draggedItemIndex, 1);
    itemsCopy.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    setPlaylistItems(itemsCopy);
  };

  const handleDragEnd = async () => {
    if (draggedItemIndex === null) return;
    setDraggedItemIndex(null);
    try {
      const itemIds = playlistItems.map(item => item.id);
      await reorderPlaylistItems(selectedPlaylistId, itemIds);
    } catch (err) {
      console.error(err);
      alert('Error updating order');
      loadPlaylistItems(selectedPlaylistId); // rollback UI
    }
  };

  const handleUpdatePlaylist = async (e, id) => {
    e.preventDefault();
    if (!editingName.trim()) {
      setEditingPlaylistId(null);
      return;
    }
    try {
      await updatePlaylist(id, editingName);
      setEditingPlaylistId(null);
      loadPlaylists();
    } catch (err) {
       console.error(err);
       alert('Error renaming playlist');
    }
  };

  const handleDeletePlaylist = async (id) => {
    if (!window.confirm('Delete this Playlist entirely? Linked monitors will lose signal.')) return;
    try {
      await deletePlaylist(id);
      if (selectedPlaylistId === id) setSelectedPlaylistId(null);
      loadPlaylists();
    } catch (err) {
      console.error(err);
      alert('Error deleting playlist');
    }
  };

  const selectedPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] font-mono text-neutral-300">
      <div className="flex items-center gap-3 mb-6">
        <MonitorPlay className="text-green-500" size={28} />
        <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
          Playlist_Controller
        </h2>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <Activity size={14} className="text-green-500 animate-pulse" />
          <span className="text-green-500">SYSTEM.SYNCED</span>
        </div>
      </div>

      <div className="flex flex-1 panel-border overflow-hidden shadow-2xl shadow-green-900/10">
        
        {/* Left Panel: Playlists List */}
        <div className="w-1/3 lg:w-1/4 bg-[#050505] border-r border-neutral-800 flex flex-col relative">
          <div className="absolute top-0 right-0 w-8 h-8 border-l border-b border-neutral-800 bg-[#0a0a0a]" />
          
          <div className="p-4 border-b border-neutral-800">
            <div className="text-[10px] text-neutral-500 mb-4 tracking-widest uppercase">
              Target Selection
            </div>
            <form onSubmit={handleCreatePlaylist} className="flex gap-2">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="NEW_TARGET_ID"
                className="w-full bg-[#0a0a0a] border border-neutral-700 text-neutral-300 px-3 py-2 text-xs focus:outline-none focus:border-green-500 transition-colors uppercase placeholder:text-neutral-600"
              />
              <button
                type="submit"
                className="bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-500 hover:text-[#050505] p-2 transition-colors flex items-center justify-center shrink-0"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </form>
          </div>
          
          <ul className="flex-1 overflow-y-auto w-full py-2">
            {playlists.map((p) => (
              <li key={p.id} className="px-2 mb-1 group relative">
                {editingPlaylistId === p.id ? (
                  <form onSubmit={(e) => handleUpdatePlaylist(e, p.id)} className="flex items-center gap-1 w-full bg-[#050505] p-2 border border-green-500/50">
                    <input 
                      type="text" 
                      value={editingName} 
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-transparent border-b border-neutral-700 text-xs text-neutral-200 uppercase flex-1 focus:outline-none focus:border-green-500"
                      autoFocus
                    />
                    <button type="submit" className="text-green-500 hover:text-green-400 p-1 bg-green-500/10 border border-green-500/30" title="Save"><Save size={14} /></button>
                    <button type="button" onClick={() => setEditingPlaylistId(null)} className="text-neutral-500 hover:text-red-500 p-1 border border-transparent hover:border-red-500/30 hover:bg-red-500/10" title="Cancel"><X size={14} /></button>
                  </form>
                ) : (
                  <div className="flex w-full items-stretch">
                    <button
                      onClick={() => setSelectedPlaylistId(p.id)}
                      className={`flex-1 text-left px-4 py-3 text-xs tracking-wide transition-all border-l-2 border-r  flex justify-between items-center ${
                        selectedPlaylistId === p.id
                          ? 'border-l-green-500 border-r-neutral-800 bg-green-500/10 text-green-400 font-bold'
                          : 'border-transparent border-r-transparent text-neutral-500 hover:border-l-neutral-600 hover:bg-[#0a0a0a] hover:text-neutral-300'
                      }`}
                    >
                      <span className="uppercase truncate pr-2">{p.name}</span>
                      {selectedPlaylistId === p.id && <span className="w-2 h-2 bg-green-500 rounded-none animate-pulse-slow shrink-0"></span>}
                    </button>
                    {/* Action Buttons */}
                    <div className="flex flex-col border-y border-r border-transparent group-hover:border-neutral-800 bg-[#050505] transition-colors">
                      <button 
                        onClick={() => { setEditingPlaylistId(p.id); setEditingName(p.name); }}
                        className="flex-1 px-2 text-neutral-600 hover:text-green-500 hover:bg-green-500/10 opacity-0 group-hover:opacity-100 transition-all border-b border-transparent group-hover:border-neutral-800"
                        title="Edit Playlist Name"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button 
                        onClick={() => handleDeletePlaylist(p.id)}
                        className="flex-1 px-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Playlist"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Main Area: Content of Selected Playlist */}
        <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
          <div className="p-4 border-b border-neutral-800 bg-[#050505] flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Terminal size={18} className="text-neutral-500" />
              <h3 className="text-sm font-bold text-neutral-100 tracking-wider">
                {selectedPlaylist ? `ACTIVE_TARGET: [${selectedPlaylist.name}]` : 'AWAITING_SELECTION...'}
              </h3>
            </div>
            <div className="text-[10px] text-neutral-600">
              {playlistItems.length} ENTRIES LOADED
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Playlist Items - Central feed */}
            <div className="flex-1 border-r border-neutral-800 overflow-y-auto p-4 md:p-6 bg-[#0a0a0a] relative">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-50" />
              
              <div className="relative z-10 space-y-3">
                {playlistItems.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-neutral-600 border border-neutral-800 border-dashed mt-8">
                    <Database size={32} className="mb-4 opacity-50" />
                    <p className="text-xs uppercase tracking-widest">Target empty. Feed awaits data.</p>
                  </div>
                )}
                {playlistItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 bg-[#050505] border p-3 transition-colors group cursor-grab active:cursor-grabbing ${
                      draggedItemIndex === index 
                        ? 'border-green-500 opacity-50 scale-[0.98]' 
                        : 'border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <div className="text-neutral-600 group-hover:text-green-500 transition-colors px-1">
                      <GripVertical size={16} />
                    </div>
                    
                    <span className="font-mono text-green-600/50 text-[10px] w-6 opacity-70 group-hover:opacity-100 transition-opacity">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    
                    <div className="flex-1 truncate text-xs uppercase text-neutral-300">
                      {item.name} 
                      <span className="text-neutral-600 ml-2 border border-neutral-700 px-1 py-0.5 text-[9px]">
                        {item.type}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-neutral-600 hover:bg-red-500/20 hover:text-red-500 border border-transparent hover:border-red-500/50 p-1.5 transition-all"
                      title="Terminate Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Available Media List - Right Sidebar */}
            <div className="w-64 bg-[#050505] overflow-y-auto relative flex flex-col">
              <div className="p-4 border-b border-neutral-800 sticky top-0 bg-[#050505] z-10">
                 <h4 className="text-[10px] tracking-widest text-neutral-500 uppercase flex items-center gap-2">
                   <Database size={12} />
                   Registry
                 </h4>
              </div>
              
              <div className="p-3 flex flex-col gap-2">
                {media.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAddMediaToPlaylist(m.id)}
                    disabled={!selectedPlaylistId}
                    className="w-full text-left flex items-start flex-col bg-[#0a0a0a] border border-neutral-800 px-3 py-2 hover:border-green-500/50 hover:bg-green-500/5 transition-all disabled:opacity-30 disabled:hover:border-neutral-800 disabled:hover:bg-[#0a0a0a] group relative"
                  >
                    <div className="flex items-center w-full justify-between mb-1">
                      <span className="text-[11px] uppercase text-neutral-400 group-hover:text-green-400 truncate pr-4">
                        {m.name}
                      </span>
                      <Plus size={14} className="text-green-500 opacity-0 group-hover:opacity-100 absolute right-2 top-2" />
                    </div>
                    <span className="text-[9px] text-neutral-600 border border-neutral-800 px-1 uppercase tracking-wider">
                      {m.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Playlists;
