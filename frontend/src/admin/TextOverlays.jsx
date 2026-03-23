import { useEffect, useState, useRef } from 'react';
import {
  getOverlays, createOverlay, updateOverlay, deleteOverlay,
  getDevices, getPlaylists, getMedia, uploadOverlayImage, API_BASE
} from '../api';
import {
  Type, Plus, Trash2, Edit3, Save, X, Eye, EyeOff,
  Monitor, ListVideo, ChevronDown, ImagePlus, Image, Upload, FolderOpen
} from 'lucide-react';

const MEDIA_BASE = API_BASE;

const POSITIONS = [
  { value: 'top-bar', label: 'Barra Superior', icon: '▔' },
  { value: 'top-left', label: 'Topo Esquerda', icon: '◸' },
  { value: 'top-right', label: 'Topo Direita', icon: '◹' },
  { value: 'center', label: 'Centro', icon: '◉' },
  { value: 'bottom-left', label: 'Inferior Esquerda', icon: '◺' },
  { value: 'bottom-right', label: 'Inferior Direita', icon: '◿' },
  { value: 'bottom-bar', label: 'Barra Inferior', icon: '▁' },
];

const ANIMATIONS = [
  { value: 'none', label: 'Nenhuma' },
  { value: 'marquee', label: 'Marquee (Letreiro)' },
  { value: 'fade-in', label: 'Fade In' },
  { value: 'typewriter', label: 'Typewriter (Digitação)' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'slide-up', label: 'Slide Up' },
  { value: 'slide-down', label: 'Slide Down' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'glow', label: 'Glow (Brilho)' },
];

const DEFAULT_FORM = {
  text: '',
  target_type: 'device',
  target_id: null,
  position: 'bottom-bar',
  animation: 'none',
  font_size: 24,
  font_color: '#FFFFFF',
  bg_color: '#000000',
  bg_blur: 0,
  font_weight: 'normal',
  text_shadow: 0,
  border: 0,
  duration_seconds: 0,
  is_active: 1,
  image_path: '',
  image_size: 100,
};

const TextOverlays = () => {
  const [overlays, setOverlays] = useState([]);
  const [devices, setDevices] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [bgOpacity, setBgOpacity] = useState(50);
  const [uploading, setUploading] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAll = async () => {
    // Fetch each resource independently so one failure doesn't break others
    try { const d = await getDevices(); setDevices(d); } catch (e) { console.error('Failed to load devices:', e); }
    try { const p = await getPlaylists(); setPlaylists(p); } catch (e) { console.error('Failed to load playlists:', e); }
    try { const m = await getMedia(); setMediaLibrary(m.filter(item => item.type === 'image')); } catch (e) { console.error('Failed to load media:', e); }
    try { const o = await getOverlays(); setOverlays(o); } catch (e) { console.error('Failed to load overlays:', e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const hexToRgba = (hex, opacity) => {
    try {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
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
    if (!form.text && !form.image_path) return;

    const payload = {
      ...form,
      target_id: Number(form.target_id),
      bg_color: hexToRgba(form.bg_color, bgOpacity),
    };

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

    setForm({
      text: overlay.text || '',
      target_type: overlay.target_type,
      target_id: overlay.target_id,
      position: overlay.position,
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
      image_size: overlay.image_size || 100,
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
    return playlists.find(p => p.id === overlay.target_id)?.name || `Playlist #${overlay.target_id}`;
  };

  const targets = form.target_type === 'device' ? devices : playlists;
  const hasContent = form.text || form.image_path;

  const getPreviewPositionStyle = (pos) => {
    const base = { position: 'absolute', maxWidth: '90%' };
    switch (pos) {
      case 'top-bar': return { ...base, top: 0, left: 0, right: 0, maxWidth: '100%' };
      case 'top-left': return { ...base, top: '8px', left: '8px' };
      case 'top-right': return { ...base, top: '8px', right: '8px' };
      case 'center': return { ...base, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      case 'bottom-left': return { ...base, bottom: '8px', left: '8px' };
      case 'bottom-right': return { ...base, bottom: '8px', right: '8px' };
      case 'bottom-bar': return { ...base, bottom: 0, left: 0, right: 0, maxWidth: '100%' };
      default: return { ...base, bottom: 0, left: 0, right: 0, maxWidth: '100%' };
    }
  };

  const getPreviewAnimation = (anim) => {
    switch (anim) {
      case 'marquee': return 'overlay-marquee 8s linear infinite';
      case 'fade-in': return 'overlay-fade-in 2s ease forwards';
      case 'typewriter': return 'overlay-typewriter 3s steps(40) forwards';
      case 'bounce': return 'overlay-bounce 1s ease';
      case 'slide-up': return 'overlay-slide-up 0.8s ease-out forwards';
      case 'slide-down': return 'overlay-slide-down 0.8s ease-out forwards';
      case 'pulse': return 'overlay-pulse 2s ease-in-out infinite';
      case 'glow': return 'overlay-glow 2s ease-in-out infinite';
      default: return 'none';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-mono font-bold text-neutral-100 tracking-wider flex items-center gap-3">
            <Type className="text-green-500" size={24} />
            TEXT_OVERLAYS<span className="text-green-500">_</span>
          </h2>
          <p className="text-xs font-mono text-neutral-500 mt-1">
            Mensagens e logos sobrepostos aos vídeos com animações e efeitos
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ ...DEFAULT_FORM }); setBgOpacity(50); }}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-black font-mono text-sm px-4 py-2.5 transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
        >
          <Plus size={16} /> NOVO OVERLAY
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form */}
            <div className="space-y-4">
              {/* Target Type + Target ID — FIRST so user picks the target */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Vincular a</label>
                  <div className="relative">
                    <select
                      value={form.target_type}
                      onChange={e => setForm(prev => ({ ...prev, target_type: e.target.value, target_id: null }))}
                      className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none"
                    >
                      <option value="device">Dispositivo</option>
                      <option value="playlist">Playlist</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                    {form.target_type === 'device' ? 'Dispositivo' : 'Playlist'}
                  </label>
                  <div className="relative">
                    <select
                      value={form.target_id ?? ''}
                      onChange={e => {
                        const val = e.target.value;
                        setForm(prev => ({ ...prev, target_id: val ? Number(val) : null }));
                      }}
                      className={`w-full bg-neutral-900 border text-neutral-200 px-3 py-2 text-sm font-mono appearance-none focus:border-green-500 focus:outline-none ${form.target_id ? 'border-neutral-700' : 'border-amber-700'
                        }`}
                    >
                      <option value="">Selecionar...</option>
                      {targets.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>
                  {!form.target_id && (
                    <p className="text-[10px] font-mono text-amber-500 mt-1">⚠ Selecione um alvo</p>
                  )}
                </div>
              </div>

              {/* Text */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Mensagem (opcional se usar imagem)</label>
                <textarea
                  value={form.text}
                  onChange={e => setForm(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Digite sua mensagem aqui..."
                  className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none resize-none h-20 placeholder:text-neutral-600"
                />
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
                  <div className="flex items-center gap-3 bg-neutral-900 border border-green-800 p-3">
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
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {/* Upload from computer */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center justify-center gap-2 bg-neutral-900 border border-dashed border-neutral-600 text-neutral-400 hover:border-green-500 hover:text-green-400 py-3 text-xs font-mono transition-all duration-200"
                    >
                      {uploading ? (
                        <span className="animate-pulse">Enviando...</span>
                      ) : (
                        <><Upload size={14} /> DO COMPUTADOR</>
                      )}
                    </button>
                    {/* Select from media library */}
                    <button
                      onClick={() => setShowMediaPicker(!showMediaPicker)}
                      className={`flex items-center justify-center gap-2 bg-neutral-900 border border-dashed text-neutral-400 hover:border-cyan-500 hover:text-cyan-400 py-3 text-xs font-mono transition-all duration-200 ${showMediaPicker ? 'border-cyan-500 text-cyan-400' : 'border-neutral-600'
                        }`}
                    >
                      <FolderOpen size={14} /> DA BIBLIOTECA
                    </button>
                  </div>
                )}

                {/* Media Library Grid */}
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

                {/* Image Size Slider */}
                {form.image_path && (
                  <div className="mt-2">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                      Tamanho da Imagem: {form.image_size}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="400"
                      value={form.image_size}
                      onChange={e => setForm(prev => ({ ...prev, image_size: parseInt(e.target.value) }))}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>
                )}
              </div>

              {/* Position Grid */}
              <div>
                <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-2 block">Posição</label>
                <div className="grid grid-cols-7 gap-1">
                  {POSITIONS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setForm(prev => ({ ...prev, position: p.value }))}
                      title={p.label}
                      className={`aspect-square flex items-center justify-center text-lg font-mono transition-all duration-150 border ${form.position === p.value
                        ? 'bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300'
                        }`}
                    >
                      {p.icon}
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Styling row — only show text styling if there's text */}
              {form.text && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Tamanho Fonte</label>
                      <input
                        type="number"
                        min="10"
                        max="120"
                        value={form.font_size}
                        onChange={e => setForm(prev => ({ ...prev, font_size: parseInt(e.target.value) || 24 }))}
                        className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Cor Fonte</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.font_color}
                          onChange={e => setForm(prev => ({ ...prev, font_color: e.target.value }))}
                          className="w-10 h-9 bg-transparent border border-neutral-700 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={form.font_color}
                          onChange={e => setForm(prev => ({ ...prev, font_color: e.target.value }))}
                          className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-2 text-xs font-mono focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">Cor Fundo</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={form.bg_color}
                          onChange={e => setForm(prev => ({ ...prev, bg_color: e.target.value }))}
                          className="w-10 h-9 bg-transparent border border-neutral-700 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={form.bg_color}
                          onChange={e => setForm(prev => ({ ...prev, bg_color: e.target.value }))}
                          className="flex-1 bg-neutral-900 border border-neutral-700 text-neutral-200 px-2 py-2 text-xs font-mono focus:border-green-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Opacity Slider */}
                  <div>
                    <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                      Opacidade do Fundo: {bgOpacity}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={bgOpacity}
                      onChange={e => setBgOpacity(parseInt(e.target.value))}
                      className="w-full accent-green-500 h-1"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { key: 'font_weight', label: 'Negrito', valueOn: 'bold', valueOff: 'normal' },
                      { key: 'text_shadow', label: 'Sombra', valueOn: 1, valueOff: 0 },
                      { key: 'border', label: 'Borda', valueOn: 1, valueOff: 0 },
                      { key: 'bg_blur', label: 'Desfoque', valueOn: 1, valueOff: 0 },
                    ].map(toggle => {
                      const isOn = toggle.key === 'font_weight'
                        ? form.font_weight === 'bold'
                        : form[toggle.key] === 1;
                      return (
                        <button
                          key={toggle.key}
                          onClick={() => setForm(prev => ({ ...prev, [toggle.key]: isOn ? toggle.valueOff : toggle.valueOn }))}
                          className={`px-3 py-2 text-xs font-mono border transition-all duration-150 ${isOn
                            ? 'bg-green-600/20 border-green-500 text-green-400'
                            : 'bg-neutral-900 border-neutral-700 text-neutral-500 hover:border-neutral-500'
                            }`}
                        >
                          {toggle.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mb-1 block">
                    Duração (segundos) — 0 = infinito
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.duration_seconds}
                    onChange={e => setForm(prev => ({ ...prev, duration_seconds: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-neutral-900 border border-neutral-700 text-neutral-200 px-3 py-2 text-sm font-mono focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setForm(prev => ({ ...prev, is_active: prev.is_active ? 0 : 1 }))}
                    className={`w-full px-3 py-2 text-xs font-mono border transition-all duration-150 flex items-center justify-center gap-2 ${form.is_active
                      ? 'bg-green-600/20 border-green-500 text-green-400'
                      : 'bg-red-900/20 border-red-800 text-red-400'
                      }`}
                  >
                    {form.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                    {form.is_active ? 'ATIVO' : 'INATIVO'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!hasContent || !form.target_id}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-mono text-sm px-4 py-3 transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"
              >
                <Save size={16} />
                {editingId ? 'ATUALIZAR OVERLAY' : 'SALVAR OVERLAY'}
              </button>
            </div>

            {/* Right Column: Live Preview */}
            <div className="space-y-2">
              <label className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Preview ao Vivo</label>
              <div className="relative bg-neutral-900 border border-neutral-700 overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {/* Simulated video background */}
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black flex items-center justify-center">
                  <div className="text-neutral-700 font-mono text-xs tracking-widest">▶ VIDEO PREVIEW</div>
                </div>

                {/* Overlay Preview */}
                {hasContent && (
                  <div style={getPreviewPositionStyle(form.position)}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: `${Math.max(8, form.font_size * 0.4)}px`,
                        color: form.font_color,
                        backgroundColor: form.text ? hexToRgba(form.bg_color, bgOpacity) : 'transparent',
                        fontWeight: form.font_weight,
                        textShadow: form.text_shadow ? '0 0 10px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.5)' : 'none',
                        border: form.border ? '1px solid rgba(255,255,255,0.2)' : 'none',
                        backdropFilter: form.bg_blur ? 'blur(8px)' : 'none',
                        padding: form.text ? '4px 10px' : '4px',
                        animation: getPreviewAnimation(form.animation),
                        whiteSpace: form.position.includes('bar') ? 'nowrap' : 'normal',
                        overflow: 'hidden',
                        fontFamily: 'monospace',
                      }}
                    >
                      {form.image_path && (
                        <img
                          src={MEDIA_BASE + form.image_path}
                          alt="logo"
                          style={{
                            height: `${Math.max(12, form.image_size * 0.3)}px`,
                            width: 'auto',
                            objectFit: 'contain',
                          }}
                        />
                      )}
                      {form.text}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono text-neutral-600 text-center">
                Prévia reduzida — ficará proporcional na TV
              </p>
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
            <p className="text-neutral-500 font-mono text-sm">Nenhum overlay criado</p>
            <p className="text-neutral-600 font-mono text-xs mt-1">Clique em "NOVO OVERLAY" para começar</p>
          </div>
        )}

        {overlays.map(overlay => (
          <div
            key={overlay.id}
            className={`panel-border p-4 flex items-center justify-between gap-4 group transition-all duration-200 hover:border-neutral-700 ${!overlay.is_active ? 'opacity-50' : ''
              }`}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {overlay.image_path && (
                <img
                  src={MEDIA_BASE + overlay.image_path}
                  alt=""
                  className="h-8 w-8 object-contain bg-neutral-800 border border-neutral-700 p-0.5 shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {overlay.target_type === 'device'
                    ? <Monitor size={12} className="text-cyan-500 shrink-0" />
                    : <ListVideo size={12} className="text-amber-500 shrink-0" />
                  }
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">
                    {getTargetName(overlay)}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-700">|</span>
                  <span className="text-[10px] font-mono text-neutral-600">{overlay.position}</span>
                  <span className="text-[10px] font-mono text-neutral-700">|</span>
                  <span className="text-[10px] font-mono text-green-600">{overlay.animation}</span>
                  {overlay.image_path && (
                    <>
                      <span className="text-[10px] font-mono text-neutral-700">|</span>
                      <Image size={10} className="text-cyan-500" />
                    </>
                  )}
                  {overlay.duration_seconds > 0 && (
                    <>
                      <span className="text-[10px] font-mono text-neutral-700">|</span>
                      <span className="text-[10px] font-mono text-neutral-500">{overlay.duration_seconds}s</span>
                    </>
                  )}
                </div>
                <p className="text-sm font-mono text-neutral-200 truncate">
                  {overlay.text || (overlay.image_path ? '[ Imagem ]' : '—')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleToggleActive(overlay)}
                className={`p-2 transition-colors ${overlay.is_active ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'
                  }`}
                title={overlay.is_active ? 'Desativar' : 'Ativar'}
              >
                {overlay.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button
                onClick={() => handleEdit(overlay)}
                className="p-2 text-neutral-500 hover:text-cyan-400 transition-colors"
                title="Editar"
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => handleDelete(overlay.id)}
                className="p-2 text-neutral-500 hover:text-red-400 transition-colors"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TextOverlays;
