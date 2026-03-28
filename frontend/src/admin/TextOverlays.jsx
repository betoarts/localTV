import { useEffect, useState, useRef } from 'react';
import {
  getOverlays, createOverlay, updateOverlay, deleteOverlay,
  getDevices, getPlaylists, getPlaylistItems, getMedia, uploadOverlayImage, API_BASE, getTemplates
} from '../api';
import {
  Type, Plus, Trash2, Edit3, Save, X, Eye, EyeOff,
  Monitor, ListVideo, ChevronDown, ImagePlus, Image, Upload, FolderOpen,
  // New icons for options
  AlertCircle, CheckCircle, Info, Star, Heart, Flame, Zap, Bell, Shield, ThumbsUp
} from 'lucide-react';

const MEDIA_BASE = API_BASE;

const LUCIDE_ICONS_MAP = {
  AlertCircle, CheckCircle, Info, Star, Heart, Flame, Zap, Bell, Shield, ThumbsUp
};

const FONT_FAMILIES = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
  'Oswald', 'Playfair Display', 'Bebas Neue', 'Pacifico', 'Cinzel'
];

const PRESET_POSITIONS = [
  { label: 'Topo Esquerda', x: 20, y: 20 },
  { label: 'Topo Direita', x: 1900, y: 20 },
  { label: 'Centro', x: 960, y: 540 },
  { label: 'Inferior Esquerda', x: 20, y: 1060 },
  { label: 'Inferior Direita', x: 1900, y: 1060 },
  { label: 'Barra Inferior', x: 0, y: 1080 }, // Using Y logic to indicate bottom bar
];

const ANIMATIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'marquee', label: 'Marquee (Letreiro)' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'typewriter', label: 'Typewriter (Digitação)' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'slide-left', label: 'Slide Left' },
  { value: 'slide-right', label: 'Slide Right' },
  { value: 'zoom-in', label: 'Zoom In' },
  { value: 'zoom-out', label: 'Zoom Out' },
  { value: 'flip', label: 'Flip' },
  { value: 'wobble', label: 'Wobble' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'glow', label: 'Glow (Brilho)' },
];

const TV_WIDTH = 1920;
const TV_HEIGHT = 1080;

const DEFAULT_FORM = {
  text: '',
  target_type: 'device',
  target_id: null,
  ui_playlist_id: '',
  font_family: 'Roboto',
  icon_name: '',
  icon_size: 40,
  icon_color: '#FFFFFF',
  pos_x: 960, // center default loosely
  pos_y: 540,
  animation: 'none',
  font_size: 60,
  font_color: '#FFFFFF',
  bg_color: '#000000',
  bg_blur: 0,
  font_weight: 'normal',
  text_shadow: 0,
  border: 0,
  duration_seconds: 0,
  is_active: 1,
  image_path: '',
  image_size: 150,
  template_id: null,
  data_json: '{}',
};

const TextOverlays = () => {
  const [overlays, setOverlays] = useState([]);
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [allPlaylistItems, setAllPlaylistItems] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const fileInputRef = useRef(null);

  // Drag state
  const previewBoxRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const fetchAll = async () => {
    try { const d = await getDevices(); setDevices(d); } catch (e) { console.error('Failed to load devices:', e); }
    try { 
      const p = await getPlaylists(); 
      setPlaylists(p); 
      let allItems = [];
      for (const pl of p) {
        try {
          const items = await getPlaylistItems(pl.id);
          allItems = [...allItems, ...items.map(i => ({...i, playlist_name: pl.name, playlist_id: pl.id}))];
        } catch (e) { console.error('Failed to load items for playlist', pl.id); }
      }
      setAllPlaylistItems(allItems);
    } catch (e) { console.error('Failed to load playlists:', e); }
    try { const m = await getMedia(); setMediaLibrary(m.filter(item => item.type === 'image')); } catch (e) { console.error('Failed to load media:', e); }
    try { const t = await getTemplates(); setTemplates(t); } catch (e) { console.error('Failed to load templates:', e); }
    try { const o = await getOverlays(); setOverlays(o); } catch (e) { console.error('Failed to load overlays:', e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const hexToRgba = (hex, opacity) => {
    try {
      if (!hex || hex === 'transparent') return `rgba(0,0,0,${opacity / 100})`;
      let r = 0, g = 0, b = 0;
      if (hex.startsWith('#')) {
        r = parseInt(hex.slice(1, 3), 16);
        g = parseInt(hex.slice(3, 5), 16);
        b = parseInt(hex.slice(5, 7), 16);
      }
      return `rgba(${r},${g},${b},${opacity / 100})`;
    } catch {
      return `rgba(0,0,0,${opacity / 100})`;
    }
  };

  const rgbaToHex = (rgba) => {
    if (!rgba) return '#000000';
    if (rgba.startsWith('#')) return rgba.slice(0, 7);
    return '#000000';
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadOverlayImage(file);
      setForm(prev => ({ ...prev, image_path: result.path }));
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSelectFromLibrary = (mediaItem) => {
    setForm(prev => ({ ...prev, image_path: mediaItem.path }));
    setShowMediaPicker(false);
  };

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, image_path: '' }));
  };

  const handleSubmit = async () => {
    if (!form.target_id) return;
    if (!form.text && !form.image_path && !form.icon_name && !form.template_id) return;

    const payload = {
      ...form,
      target_id: Number(form.target_id),
      bg_color: hexToRgba(form.bg_color, bgOpacity),
    };
    delete payload.ui_playlist_id; // Remove ui only field

    try {
      if (editingId) {
        await updateOverlay(editingId, payload);
      } else {
        await createOverlay(payload);
      }
      setForm({ ...DEFAULT_FORM });
      setEditingId(null);
      setShowForm(false);
      setBgOpacity(50);
      fetchAll();
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const handleEdit = (overlay) => {
    const bgHex = rgbaToHex(overlay.bg_color);
    const opacityMatch = overlay.bg_color?.match(/[\d.]+\)$/);
    const opacity = opacityMatch ? Math.round(parseFloat(opacityMatch[0]) * 100) : 50;

    let ui_playlist_id = '';
    if (overlay.target_type === 'playlist_item') {
      const item = allPlaylistItems.find(i => i.id === overlay.target_id);
      if (item) ui_playlist_id = item.playlist_id;
    }

    setForm({
      text: overlay.text || '',
      target_type: overlay.target_type,
      target_id: overlay.target_id,
      ui_playlist_id,
      font_family: overlay.font_family || 'Roboto',
      icon_name: overlay.icon_name || '',
      icon_size: overlay.icon_size || 40,
      icon_color: overlay.icon_color || '#FFFFFF',
      pos_x: overlay.pos_x !== undefined ? overlay.pos_x : 50,
      pos_y: overlay.pos_y !== undefined ? overlay.pos_y : 50,
      animation: overlay.animation,
      font_size: overlay.font_size,
      font_color: overlay.font_color,
      bg_color: bgHex,
      bg_blur: overlay.bg_blur,
      font_weight: overlay.font_weight,
      text_shadow: overlay.text_shadow,
      border: overlay.border,
      duration_seconds: overlay.duration_seconds,
      is_active: overlay.is_active,
      image_path: overlay.image_path || '',
      image_size: overlay.image_size || 150,
      template_id: overlay.template_id || null,
      data_json: overlay.data_json || '{}',
    });
    setBgOpacity(opacity);
    setEditingId(overlay.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await deleteOverlay(id);
    fetchAll();
  };

  const handleToggleActive = async (overlay) => {
    await updateOverlay(overlay.id, { ...overlay, is_active: overlay.is_active ? 0 : 1 });
    fetchAll();
  };

  const getTargetName = (overlay) => {
    if (overlay.target_type === 'device') {
      return devices.find(d => d.id === overlay.target_id)?.name || `Device #${overlay.target_id}`;
    }
    if (overlay.target_type === 'playlist_item') {
      const item = allPlaylistItems.find(i => i.id === overlay.target_id);
      return item ? `${item.playlist_name} - ${item.name || item.filename}` : `Vídeo #${overlay.target_id}`;
    }
    return `Playlist #${overlay.target_id}`;
  };

  const targets = form.target_type === 'device' ? devices : playlists;
  const hasContent = form.text || form.image_path || form.icon_name || form.template_id;

  // Drag mapping logic
  const handlePointerDown = (e) => {
    if (!previewBoxRef.current) return;
    setIsDragging(true);
    e.target.setPointerCapture(e.pointerId); // capture pointer events
    
    // Calculate initial offset from the pointer to the element's actual x/y scaled
    const boxRect = previewBoxRef.current.getBoundingClientRect();
    const scaleX = TV_WIDTH / boxRect.width;
    const scaleY = TV_HEIGHT / boxRect.height;
    
    // Position of cursor relative to preview container
    const relativeX = (e.clientX - boxRect.left) * scaleX;
    const relativeY = (e.clientY - boxRect.top) * scaleY;
    
    setDragOffset({
      x: relativeX - form.pos_x,
      y: relativeY - form.pos_y
    });
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !previewBoxRef.current) return;
    
    const boxRect = previewBoxRef.current.getBoundingClientRect();
    const scaleX = TV_WIDTH / boxRect.width;
    const scaleY = TV_HEIGHT / boxRect.height;
    
    let newX = (e.clientX - boxRect.left) * scaleX - dragOffset.x;
    let newY = (e.clientY - boxRect.top) * scaleY - dragOffset.y;
    
    // Basic bounds checking for typical center anchor
    newX = Math.max(0, Math.min(newX, TV_WIDTH));
    newY = Math.max(0, Math.min(newY, TV_HEIGHT));
    
    setForm(prev => ({ ...prev, pos_x: Math.round(newX), pos_y: Math.round(newY) }));
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  const getPreviewPositionStyle = () => {
    const pctX = (form.pos_x / TV_WIDTH) * 100;
    const pctY = (form.pos_y / TV_HEIGHT) * 100;
    
    return {
      position: 'absolute',
      left: `${pctX}%`,
      top: `${pctY}%`,
      transform: `translate(-${pctX}%, -${pctY}%)`, // align center based on relative coordinate
      // We scale the contents so they visually look proportional to TV size
      // We'll apply scale via CSS transformation on the actual content wrapper
      width: 'max-content',
      cursor: isDragging ? 'grabbing' : 'grab',
      userSelect: 'none',
      zIndex: 50,
    };
  };

  const getPreviewAnimation = (anim) => {
    switch (anim) {
      case 'marquee': return 'overlay-marquee 8s linear infinite';
      case 'fade-in': return 'overlay-fade-in 2s ease forwards';
      case 'typewriter': return 'overlay-typewriter 3s steps(40) forwards';
      case 'bounce': return 'overlay-bounce 1s ease';
      case 'slide-up': return 'overlay-slide-up 0.8s ease-out forwards';
      case 'slide-down': return 'overlay-slide-down 0.8s ease-out forwards';
      case 'slide-left': return 'overlay-slide-left 0.8s ease-out forwards';
      case 'slide-right': return 'overlay-slide-right 0.8s ease-out forwards';
      case 'zoom-in': return 'overlay-zoom-in 0.8s ease-out forwards';
      case 'zoom-out': return 'overlay-zoom-out 0.8s ease-out forwards';
      case 'flip': return 'overlay-flip 1s ease-out forwards';
      case 'wobble': return 'overlay-wobble 1s ease-in-out infinite';
      case 'pulse': return 'overlay-pulse 2s ease-in-out infinite';
      case 'glow': return 'overlay-glow 2s ease-in-out infinite';
      default: return 'none';
    }
  };

  // Preview scaling factor to make fonts relative to TV resolution
  const [scaleFactor, setScaleFactor] = useState(1);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setScaleFactor(entry.contentRect.width / TV_WIDTH);
      }
    });
    if (previewBoxRef.current) {
      resizeObserver.observe(previewBoxRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [showForm]);

  const IconComponent = form.icon_name ? LUCIDE_ICONS_MAP[form.icon_name] : null;

  return (
    <div className="space-y-6 font-mono text-neutral-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6 px-1">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 tracking-widest flex items-center gap-3 uppercase">
            <Type className="text-green-500" size={24} />
            Overlays_Ctrl
          </h2>
          <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-tighter sm:tracking-normal">
            Visual Layer Management • Real-time Broadcast Injection
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...DEFAULT_FORM }); setBgOpacity(50); }}
          className="flex items-center justify-center gap-2 bg-green-600/20 text-green-400 border border-green-500/50 hover:bg-green-500 hover:text-[#050505] px-4 py-3 sm:py-2.5 transition-all text-xs font-bold tracking-widest uppercase"
        >
          <Plus size={16} /> NEW_OVERLAY
        </button>
      </div>

      {/* Editor Form */}
      {showForm && (
        <div className="panel-border p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
            <h3 className="text-sm font-mono text-green-400 tracking-wider">
              {editingId ? '✎ EDITAR OVERLAY' : '+ NOVO OVERLAY'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-neutral-500 hover:text-red-400 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Master layout: vertical if narrow, horizontal if wide */}
          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Left Column: Form Fields */}
            <div className="xl:w-[500px] shrink-0 space-y-4">
              
              {/* Target Type + Target ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Vincular a</label>
                  <div className="relative">
                    <select
                      value={form.target_type}
                      onChange={e => setForm(prev => ({ ...prev, target_type: e.target.value, target_id: null, ui_playlist_id: '' }))}
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none"
                    >
                      <option value="device">Dispositivo</option>
                      <option value="playlist_item">Vídeo Específico</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                    {form.target_type === 'device' ? 'Dispositivo' : 'Vídeo Específico'}
                  </label>
                  
                  {form.target_type === 'device' ? (
                    <div className="relative">
                      <select
                        value={form.target_id ?? ''}
                        onChange={e => {
                          const val = e.target.value;
                          setForm(prev => ({ ...prev, target_id: val ? Number(val) : null }));
                        }}
                        className={`w-full bg-neutral-900 border text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none ${form.target_id ? 'border-neutral-700' : 'border-amber-700'}`}
                      >
                        <option value="">Selecionar Dispositivo...</option>
                        {devices.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                       <div className="relative">
                        <select
                          value={form.ui_playlist_id ?? ''}
                          onChange={e => setForm(prev => ({ ...prev, ui_playlist_id: e.target.value, target_id: null }))}
                          className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none"
                        >
                          <option value="">1. Selecionar Playlist...</option>
                          {playlists.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                      </div>
                      
                      {form.ui_playlist_id && (
                        <div className="relative">
                          <select
                            value={form.target_id ?? ''}
                            onChange={e => setForm(prev => ({ ...prev, target_id: e.target.value ? Number(e.target.value) : null }))}
                            className={`w-full bg-neutral-900 border text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none ${form.target_id ? 'border-neutral-700' : 'border-amber-700'}`}
                          >
                            <option value="">2. Selecionar Vídeo...</option>
                            {allPlaylistItems.filter(i => i.playlist_id == form.ui_playlist_id).map(i => (
                              <option key={i.id} value={i.id}>{i.name || i.filename}</option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                        </div>
                      )}
                    </div>
                  )}

                  {!form.target_id && (
                    <p className="text-[10px] font-mono text-amber-500 mt-1">⚠ Selecione um alvo</p>
                  )}
                </div>
              </div>

              {/* Text Form */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Mensagem</label>
                <textarea
                  value={form.text}
                  onChange={e => setForm(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none resize-none h-20 placeholder:text-neutral-600"
                />
              </div>

              {/* Template Selection */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 block">Overlay de Template (Dynamic Layout)</label>
                {form.template_id ? (
                  <div className="flex items-center gap-3 bg-neutral-900 border border-green-800 p-3 mb-2">
                    <div className="h-12 w-12 bg-neutral-800 border border-neutral-600 flex items-center justify-center text-green-500">
                      <ListVideo size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-neutral-300 truncate">
                        {templates.find(t => t.id === form.template_id)?.name || 'Template Selecionado'}
                      </p>
                      <p className="text-[10px] font-mono text-green-500 uppercase">✓ Template Ativo</p>
                    </div>
                    <button
                      onClick={() => setForm(prev => ({ ...prev, template_id: null }))}
                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className={`w-full flex items-center justify-center gap-2 bg-neutral-900 border border-dashed text-neutral-400 hover:border-green-500 hover:text-green-400 py-3 text-xs font-mono transition-all duration-200 mb-2 ${showTemplatePicker ? 'border-green-500 text-green-400' : 'border-neutral-700'}`}
                  >
                    <Plus size={14} /> SELECIONAR TEMPLATE
                  </button>
                )}

                {showTemplatePicker && !form.template_id && (
                  <div className="bg-neutral-900 border border-neutral-700 p-3 max-h-48 overflow-y-auto mb-4">
                    {templates.length === 0 ? (
                      <p className="text-[10px] font-mono text-neutral-600 text-center py-4 uppercase">Nenhum template encontrado</p>
                    ) : (
                      <div className="space-y-1">
                        {templates.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setForm(prev => ({ ...prev, template_id: t.id }));
                              setShowTemplatePicker(false);
                            }}
                            className="w-full text-left bg-neutral-800 border border-neutral-700 hover:border-green-500 p-2 text-xs font-mono transition-colors"
                          >
                            <span className="text-neutral-500 mr-2 text-[10px]">ID:{t.id}</span>
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {form.template_id && (
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Variáveis do Template (JSON)</label>
                    <textarea
                      value={form.data_json}
                      onChange={e => setForm(prev => ({ ...prev, data_json: e.target.value }))}
                      placeholder='{"title": "Urgente", "msg": "..."}'
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-[10px] font-mono focus:border-green-500 focus:outline-none resize-none h-20"
                    />
                  </div>
                )}
              </div>

              {/* Font Family & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Google Font</label>
                  <div className="relative">
                    <select
                      value={form.font_family}
                      onChange={e => setForm(prev => ({ ...prev, font_family: e.target.value }))}
                      style={{ fontFamily: form.font_family }}
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm appearance-none focus:border-green-500 focus:outline-none"
                    >
                      {FONT_FAMILIES.map(font => (
                        <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Tamanho da Fonte (px)</label>
                  <input
                    type="number"
                    min="10"
                    max="400"
                    value={form.font_size}
                    onChange={e => setForm(prev => ({ ...prev, font_size: parseInt(e.target.value) || 24 }))}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Image Upload / Library Picker */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 block">Logo / Imagem (PNG, SVG)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.svg,image/png,image/svg+xml"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {form.image_path ? (
                  <div className="flex items-center gap-3 bg-neutral-900 border border-green-800 p-3 mb-2">
                    <img
                      src={MEDIA_BASE + form.image_path}
                      alt="overlay logo"
                      className="h-12 w-12 object-contain bg-neutral-800 border border-neutral-600 p-1"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-neutral-300 truncate">{form.image_path.split('/').pop()}</p>
                      <p className="text-[10px] font-mono text-green-500">✓ Imagem selecionada</p>
                    </div>
                    <button
                      onClick={handleRemoveImage}
                      className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Remover imagem"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button
                      onClick={() => setShowMediaPicker(true)}
                      className="p-1.5 text-neutral-500 hover:text-green-400 transition-colors"
                      title="Escolher da biblioteca"
                    >
                      <FolderOpen size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 bg-neutral-900 border border-dashed border-neutral-700 hover:border-green-500 hover:text-green-400 py-3 text-xs font-mono transition-all duration-200"
                    >
                      {uploading ? <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"/> : <Upload size={14} />} UPLOAD LOCAL
                    </button>
                    <button
                      onClick={() => setShowMediaPicker(!showMediaPicker)}
                      className="flex items-center justify-center gap-2 bg-neutral-900 border border-dashed border-neutral-700 hover:border-green-500 hover:text-green-400 py-3 text-xs font-mono transition-all duration-200"
                    >
                      <FolderOpen size={14} /> BIBLIOTECA
                    </button>
                  </div>
                )}

                {showMediaPicker && (
                  <div className="bg-neutral-900 border border-neutral-700 p-3 max-h-48 overflow-y-auto mb-4 mt-2">
                    {mediaLibrary.length === 0 ? (
                      <p className="text-[10px] font-mono text-neutral-600 text-center py-4 uppercase">Nenhuma imagem na biblioteca</p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {mediaLibrary.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectFromLibrary(item)}
                            className="aspect-square bg-neutral-800 border border-neutral-700 hover:border-green-500 cursor-pointer overflow-hidden p-1 group"
                          >
                            <img src={MEDIA_BASE + item.path} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Icon selection */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Ícone Central</label>
                  <div className="relative">
                    <select
                      value={form.icon_name}
                      onChange={e => setForm(prev => ({ ...prev, icon_name: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none"
                    >
                      <option value="">Nenhum</option>
                      {Object.keys(LUCIDE_ICONS_MAP).map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Cor Ícone</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={form.icon_color}
                      onChange={e => setForm(prev => ({ ...prev, icon_color: e.target.value }))}
                      className="w-10 h-9 bg-transparent border border-neutral-700 cursor-pointer p-0"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Tam. Ícone</label>
                  <input
                    type="number"
                    min="12"
                    max="200"
                    value={form.icon_size}
                    onChange={e => setForm(prev => ({ ...prev, icon_size: parseInt(e.target.value) || 40 }))}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coordinates Presets (pixels) */}
              <div className="pt-2">
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 block">Posições Rápidas (Presets em PX)</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_POSITIONS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setForm(prev => ({ ...prev, pos_x: p.x, pos_y: p.y }))}
                      className="bg-neutral-900 border border-neutral-700 text-neutral-400 hover:border-green-500 hover:text-green-400 py-1.5 text-[10px] font-mono transition-all duration-200"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 mb-1 inline-block">Position X (px)</span>
                    <input type="number" value={form.pos_x} onChange={e => setForm(f => ({...f, pos_x: parseInt(e.target.value)||0}))} className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1 text-xs focus:border-green-500 focus:outline-none"/>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-neutral-500 mb-1 inline-block">Position Y (px)</span>
                    <input type="number" value={form.pos_y} onChange={e => setForm(f => ({...f, pos_y: parseInt(e.target.value)||0}))} className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-1 text-xs focus:border-green-500 focus:outline-none"/>
                  </div>
                </div>
              </div>

              {/* Style Colors */}
              {hasContent && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Cor Fonte</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={form.font_color} onChange={e => setForm(prev => ({ ...prev, font_color: e.target.value }))} className="w-10 h-9 bg-transparent border border-neutral-700 cursor-pointer" />
                        <input type="text" value={form.font_color} onChange={e => setForm(prev => ({ ...prev, font_color: e.target.value }))} className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-2 text-xs font-mono focus:border-green-500 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Cor Fundo</label>
                      <div className="flex gap-2 items-center">
                        <input type="color" value={form.bg_color} onChange={e => setForm(prev => ({ ...prev, bg_color: e.target.value }))} className="w-10 h-9 bg-transparent border border-neutral-700 cursor-pointer" />
                        <input type="text" value={form.bg_color} onChange={e => setForm(prev => ({ ...prev, bg_color: e.target.value }))} className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-2 text-xs font-mono focus:border-green-500 focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                      Opacidade do Fundo: {bgOpacity}%
                    </label>
                    <input type="range" min="0" max="100" value={bgOpacity} onChange={e => setBgOpacity(parseInt(e.target.value))} className="w-full accent-green-500 h-1" />
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'font_weight', label: 'Negrito', valueOn: 'bold', valueOff: 'normal' },
                      { key: 'text_shadow', label: 'Sombra', valueOn: 1, valueOff: 0 },
                      { key: 'border', label: 'Borda', valueOn: 1, valueOff: 0 },
                      { key: 'bg_blur', label: 'Desfoque', valueOn: 1, valueOff: 0 },
                    ].map(toggle => {
                      const isOn = toggle.key === 'font_weight' ? form.font_weight === 'bold' : form[toggle.key] === 1;
                      return (
                        <button
                          key={toggle.key}
                          onClick={() => setForm(prev => ({ ...prev, [toggle.key]: isOn ? toggle.valueOff : toggle.valueOn }))}
                          className={`px-2 py-1 text-[10px] font-mono border transition-all duration-150 ${isOn ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500'}`}
                        >
                          {toggle.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Animation */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Animação</label>
                <div className="relative">
                  <select
                    value={form.animation}
                    onChange={e => setForm(prev => ({ ...prev, animation: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none"
                  >
                    {ANIMATIONS.map(a => (
                      <option key={a.value} value={a.value}>{a.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                </div>
              </div>

              {/* Advanced / Duration / Upload */}
              <div className="pt-2 border-t border-neutral-800">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Duração (0 = infinito)</label>
                    <input type="number" min="0" value={form.duration_seconds} onChange={e => setForm(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))} className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={() => setForm(prev => ({ ...prev, is_active: prev.is_active ? 0 : 1 }))} className={`w-full px-3 py-2 text-xs font-mono border transition-all duration-150 flex items-center justify-center gap-2 ${form.is_active ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
                      {form.is_active ? <Eye size={14} /> : <EyeOff size={14} />} {form.is_active ? 'ATIVO' : 'INATIVO'}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button onClick={handleSubmit} disabled={!hasContent || !form.target_id} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-mono text-sm px-4 py-3 transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                  <Save size={16} /> {editingId ? 'ATUALIZAR OVERLAY' : 'SALVAR OVERLAY'}
                </button>
              </div>
            </div>

            {/* Right Column: DRAG & DROP Preview Dashboard */}
            <div className="flex-1 space-y-2 min-h-[400px]">
              <label className="text-[10px] font-mono text-green-500 uppercase tracking-wider flex items-center justify-between">
                <span>Preview Interativo 1920x1080 (Arraste e solte o texto)</span>
                {isDragging && <span className="animate-pulse text-yellow-400 font-bold">SOLTAR PARA SALVAR POSIÇÃO</span>}
              </label>

              <div 
                ref={previewBoxRef}
                className="relative bg-neutral-950 border border-neutral-700 shadow-2xl overflow-hidden cursor-crosshair w-full" 
                style={{ aspectRatio: '16/9' }}
              >
                {/* Simulated video background */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-black flex items-center justify-center select-none pointer-events-none">
                  <Monitor size={64} className="text-neutral-900 opacity-30" />
                </div>

                {/* The Overlay */}
                {hasContent && (
                  <div 
                    style={getPreviewPositionStyle()}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transform: `scale(${scaleFactor})`, // Scale down to match container
                        transformOrigin: 'center center', // Scale from anchor point
                        fontSize: `${form.font_size}px`,
                        fontFamily: form.font_family,
                        color: form.font_color,
                        backgroundColor: (form.text || form.icon_name) ? hexToRgba(form.bg_color, bgOpacity) : 'transparent',
                        fontWeight: form.font_weight,
                        textShadow: form.text_shadow ? '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' : 'none',
                        border: form.border ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        backdropFilter: form.bg_blur ? 'blur(8px)' : 'none',
                        padding: (form.text || form.icon_name) ? '12px 24px' : '4px', // Standard HD padding based on pixel size
                        animation: getPreviewAnimation(form.animation),
                        whiteSpace: 'pre-wrap',
                      }}
                      className={isDragging ? 'shadow-[0_0_20px_rgba(255,255,255,0.3)] border-green-500' : ''}
                    >
                      {IconComponent && <IconComponent size={form.icon_size} color={form.icon_color} />}
                      {form.image_path && (
                        <img
                          src={MEDIA_BASE + form.image_path}
                          alt="logo"
                          style={{
                            height: `${form.image_size}px`,
                            width: 'auto',
                            objectFit: 'contain',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      <span style={{ pointerEvents: 'none' }}>{form.text}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Image control underneath preview */}
              <div className="flex gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase block mb-1">Adicionar Logo (Upload)</label>
                  <input ref={fileInputRef} type="file" accept=".png,.svg,image/png,image/svg+xml" onChange={handleImageUpload} className="hidden" />
                  {form.image_path ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] truncate text-green-400">Img Adicionada</span>
                      <button onClick={handleRemoveImage} className="text-red-400"><Trash2 size={12} /></button>
                      <input type="number" min="20" max="600" value={form.image_size} onChange={e => setForm(f => ({...f, image_size: parseInt(e.target.value)}))} className="w-16 bg-neutral-900 border border-neutral-700 px-1 py-0.5 text-xs focus:border-green-500" title="Tamanho IMG" />
                      <span className="text-[10px] text-neutral-500">px</span>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-[10px] text-neutral-300 transition-colors uppercase border border-neutral-700">
                        <Upload size={12} /> {uploading ? 'Up...' : 'Upload'}
                      </button>
                      <button onClick={() => setShowMediaPicker(!showMediaPicker)} className="flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 px-3 py-1.5 text-[10px] text-neutral-300 transition-colors uppercase border border-neutral-700">
                        <FolderOpen size={12} /> BIBLIOTECA
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {showMediaPicker && !form.image_path && (
                  <div className="mt-2 bg-neutral-900 border border-neutral-700 p-3 max-h-48 overflow-y-auto">
                    {mediaLibrary.length === 0 ? (
                      <p className="text-[10px] font-mono text-neutral-600 text-center py-4">Nenhuma imagem na biblioteca</p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {mediaLibrary.map(item => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectFromLibrary(item)}
                            className="aspect-square bg-neutral-800 border border-neutral-700 hover:border-cyan-500 p-1 transition-all duration-150 group overflow-hidden"
                            title={item.name}
                          >
                            <img
                              src={MEDIA_BASE + item.path}
                              alt={item.name}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Overlays List */}
      <div className="space-y-2">
        <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-3">
          {overlays.length} overlay(s) registrado(s)
        </div>

        {overlays.length === 0 && !showForm && (
          <div className="panel-border p-12 flex flex-col items-center justify-center text-center">
            <Type className="text-neutral-700 mb-4" size={48} />
            <p className="text-neutral-500 font-mono text-sm uppercase tracking-widest">Nenhum overlay criado</p>
            <p className="text-neutral-600 font-mono text-[10px] mt-2 uppercase tracking-tight">Clique em "NOVO OVERLAY" para iniciar a transmissão</p>
          </div>
        )}

        {overlays.map(overlay => (
          <div
            key={overlay.id}
            className={`panel-border p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-all duration-200 hover:border-neutral-700 ${!overlay.is_active ? 'opacity-50' : ''}`}
          >
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              {overlay.image_path && (
                <img src={MEDIA_BASE + overlay.image_path} alt="" className="h-10 w-10 sm:h-8 sm:w-8 object-contain bg-neutral-800 border border-neutral-700 p-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1 font-mono text-[10px]">
                  <div className="flex items-center gap-1">
                    {overlay.target_type === 'device' ? <Monitor size={12} className="text-cyan-500 shrink-0" /> : <ListVideo size={12} className="text-amber-500 shrink-0" />}
                    <span className="text-neutral-500 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">{getTargetName(overlay)}</span>
                  </div>
                  <span className="text-neutral-700">|</span>
                  <span className="text-neutral-500 font-bold uppercase tracking-tighter" style={{ fontFamily: overlay.font_family}}>{overlay.font_family || 'Roboto'}</span>
                  <span className="text-neutral-700">|</span>
                  <span className="text-neutral-600 uppercase tracking-tighter">Pos: {overlay.pos_x},{overlay.pos_y}</span>
                  <span className="text-neutral-700">|</span>
                  <span className="text-green-600 uppercase tracking-tighter">{overlay.animation}</span>
                  {overlay.duration_seconds > 0 && (
                    <>
                      <span className="text-neutral-700">|</span>
                      <span className="text-neutral-500">{overlay.duration_seconds}S</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-mono text-neutral-200 truncate uppercase" style={{ fontFamily: overlay.font_family}}>
                  {overlay.template_id 
                    ? `[ TEMPLATE_INJECTED: ${overlay.template_name || '...'} ]` 
                    : <>
                        {overlay.icon_name && <span className="text-yellow-500 mr-2">[{overlay.icon_name}]</span>}
                        {overlay.text || (overlay.image_path ? '[ IMAGE_DATA_INJECTED ]' : '—')}
                      </>
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1 shrink-0 border-t sm:border-t-0 border-neutral-800/50 pt-2 sm:pt-0">
              <button onClick={() => handleToggleActive(overlay)} className={`p-2 transition-colors ${overlay.is_active ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'}`} title={overlay.is_active ? 'Desativar' : 'Ativar'}>
                {overlay.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => handleEdit(overlay)} className="p-2 text-neutral-500 hover:text-cyan-400 transition-colors" title="Editar"><Edit3 size={14} /></button>
              <button onClick={() => handleDelete(overlay.id)} className="p-2 text-neutral-500 hover:text-red-400 transition-colors" title="Remover"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TextOverlays;
