import { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api';
import { Plus, Trash2, Save, X, Layout, Code, Eye, RefreshCw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import TemplateRenderer from '../player/TemplateRenderer';

// Default mock data for previewing templates with variables
const DEFAULT_MOCK_DATA = {
  title: 'Titulo de Exemplo',
  msg: 'Mensagem de demonstração ao vivo',
  subtitle: 'Subtítulo',
  text: 'Texto de exemplo',
  name: 'Nome Completo',
  price: 'R$ 99,90',
  time: '10:30',
  date: '27/03/2025',
  channel: 'Canal 1',
  info: 'Informação importante',
};

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', json_layout: '' });
  const [mockData, setMockData] = useState(JSON.stringify(DEFAULT_MOCK_DATA, null, 2));
  const [showMockEditor, setShowMockEditor] = useState(false);
  const [jsonError, setJsonError] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(100);

  const defaultLayout = {
    elements: [
      {
        type: "rect",
        x: 0, y: 900, width: 1920, height: 180,
        backgroundColor: "rgba(0,0,0,0.75)"
      },
      {
        type: "text",
        content: "{{title}}",
        x: 60, y: 920,
        fontSize: 72,
        fontWeight: "bold",
        color: "#ffffff"
      },
      {
        type: "text",
        content: "{{msg}}",
        x: 60, y: 1010,
        fontSize: 40,
        color: "#cccccc"
      }
    ]
  };

  const loadTemplates = () => {
    getTemplates().then(data => {
      setTemplates(Array.isArray(data) ? data : []);
    }).catch(err => {
      console.error("Templates load error:", err);
      setTemplates([]);
    });
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEdit = (t) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, json_layout: t.json_layout });
    setIsCreating(false);
    setJsonError(null);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({ name: 'Novo Template', json_layout: JSON.stringify(defaultLayout, null, 2) });
    setJsonError(null);
  };

  const handleJsonChange = (value) => {
    setFormData(prev => ({ ...prev, json_layout: value }));
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch {
      setJsonError('JSON inválido');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (jsonError) return;
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formData);
      } else {
        await createTemplate(formData);
      }
      setEditingTemplate(null);
      setIsCreating(false);
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar template.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este template?')) return;
    try {
      await deleteTemplate(id);
      loadTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  // Parse mock data safely
  const parsedMockData = (() => {
    try { return JSON.parse(mockData); }
    catch { return DEFAULT_MOCK_DATA; }
  })();

  // Parse layout safely for preview
  const parsedLayout = (() => {
    try { return formData.json_layout ? JSON.parse(formData.json_layout) : null; }
    catch { return null; }
  })();

  return (
    <div className="flex flex-col h-full font-mono text-neutral-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Layout className="text-green-500" size={24} />
          <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
            Template_Registry
          </h2>
          <span className="text-[10px] text-neutral-600 border border-neutral-800 px-2 py-0.5 uppercase">
            {templates.length} systems
          </span>
        </div>
        <button
          onClick={handleCreate}
          className="bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-500 hover:text-[#050505] px-4 py-2 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <Plus size={16} /> NEW_TEMPLATE
        </button>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        
        {/* Templates List */}
        <div className="w-56 shrink-0 bg-[#0a0a0a] border border-neutral-800 overflow-y-auto p-3">
          <div className="text-[10px] text-neutral-500 mb-3 tracking-widest uppercase">Systems</div>
          <div className="space-y-1.5">
            {templates.map((t) => (
              <div
                key={t.id}
                className={`group flex items-center justify-between p-2.5 border transition-colors cursor-pointer ${
                  editingTemplate?.id === t.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-neutral-800 hover:border-neutral-700 bg-[#050505]'
                }`}
                onClick={() => handleEdit(t)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Code size={12} className={editingTemplate?.id === t.id ? 'text-green-500 shrink-0' : 'text-neutral-600 shrink-0'} />
                  <span className="text-xs uppercase font-bold truncate">{t.name}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-[10px] text-neutral-700 text-center py-6 uppercase">Nenhum template</p>
            )}
          </div>
        </div>

        {/* Editor + Preview Area */}
        {(editingTemplate || isCreating) ? (
          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between bg-[#050505] border border-neutral-800 px-4 py-2.5 shrink-0">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-transparent border-b border-neutral-700 text-neutral-100 focus:outline-none focus:border-green-500 uppercase font-bold px-1 py-0.5 text-sm"
                placeholder="TEMPLATE_NAME"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMockEditor(!showMockEditor)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border transition-colors ${showMockEditor ? 'border-amber-500 text-amber-400 bg-amber-900/20' : 'border-neutral-700 text-neutral-500 hover:border-neutral-500'}`}
                >
                  <RefreshCw size={12} /> MOCK_DATA
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
                  className="p-1.5 text-neutral-500 hover:text-white"
                >
                  <X size={18} />
                </button>
                <button
                  onClick={handleSave}
                  disabled={!!jsonError}
                  className="bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-[#050505] px-4 py-1.5 text-xs font-bold flex items-center gap-2 hover:bg-green-400 transition-colors"
                >
                  <Save size={14} /> SAVE
                </button>
              </div>
            </div>

            {/* Split Pane: JSON Editor | Preview */}
            <div className="flex flex-1 gap-3 overflow-hidden min-h-0">
              
              {/* JSON Editor */}
              <div className="flex flex-col w-1/2 min-h-0">
                <div className="flex items-center justify-between bg-[#050505] border border-neutral-800 border-b-0 px-3 py-1.5 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] text-green-500/70">
                    <Code size={10} /> JSON_EDITOR
                  </div>
                  {jsonError && <span className="text-[10px] text-red-400">{jsonError}</span>}
                </div>
                <textarea
                  value={formData.json_layout}
                  onChange={(e) => handleJsonChange(e.target.value)}
                  className="flex-1 bg-[#050505] border border-neutral-800 text-green-400 p-4 font-mono text-xs focus:outline-none focus:border-green-500/50 resize-none"
                  spellCheck="false"
                />
                
                {/* Mock Data Editor (collapses under JSON editor) */}
                {showMockEditor && (
                  <div className="shrink-0 mt-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500/70 bg-[#050505] border border-neutral-800 border-b-0 px-3 py-1.5">
                      <RefreshCw size={10} /> VARIÁVEIS DE PREVIEW (Mock Data)
                    </div>
                    <textarea
                      value={mockData}
                      onChange={(e) => setMockData(e.target.value)}
                      className="w-full h-32 bg-[#050505] border border-amber-900/30 text-amber-300/80 p-3 font-mono text-[10px] focus:outline-none resize-none"
                      spellCheck="false"
                    />
                  </div>
                )}
              </div>

              {/* Live Preview Panel */}
              <div className="flex flex-col w-1/2 min-h-0">
                {/* Preview toolbar with zoom controls */}
                <div className="flex items-center gap-2 bg-[#050505] border border-neutral-800 border-b-0 px-3 py-1.5 shrink-0">
                  <Eye size={10} className="text-cyan-500" />
                  <span className="text-[10px] text-cyan-500/70">LIVE_PREVIEW · 1920x1080</span>
                  
                  {/* Zoom Controls */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewZoom(z => Math.max(25, z - 25))}
                      className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut size={12} />
                    </button>
                    <input
                      type="range"
                      min="25"
                      max="200"
                      step="25"
                      value={previewZoom}
                      onChange={e => setPreviewZoom(Number(e.target.value))}
                      className="w-20 h-1 accent-cyan-500"
                      title={`Zoom: ${previewZoom}%`}
                    />
                    <button
                      onClick={() => setPreviewZoom(z => Math.min(200, z + 25))}
                      className="p-1 text-neutral-500 hover:text-neutral-200 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn size={12} />
                    </button>
                    <span className="text-[9px] font-mono text-cyan-600 w-8 text-right">{previewZoom}%</span>
                    {previewZoom !== 100 && (
                      <button
                        onClick={() => setPreviewZoom(100)}
                        className="p-1 text-neutral-600 hover:text-amber-400 transition-colors"
                        title="Reset zoom"
                      >
                        <Maximize2 size={11} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Preview viewport — scrollable when zoomed in */}
                <div
                  className="flex-1 bg-neutral-950 border border-neutral-800 relative overflow-auto"
                  style={{ minHeight: 0 }}
                >
                  {/* Inner canvas scaled at 1920x1080, then CSS-scaled by zoom */}
                  <div
                    style={{
                      width: 1920,
                      height: 1080,
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top left',
                      // Make the scroll container aware of the scaled size
                      marginBottom: `${1080 * (previewZoom / 100) - 1080}px`,
                      marginRight: `${1920 * (previewZoom / 100) - 1920}px`,
                      position: 'relative',
                      flexShrink: 0,
                    }}
                  >
                    {/* Background gradient simulating video */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-800 to-black" />
                    
                    {/* Simulated scene content */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
                      <Layout size={160} className="text-neutral-500" />
                    </div>

                    {/* Template Renderer — real 1920×1080 pixel space */}
                    {parsedLayout ? (
                      <div className="absolute inset-0">
                        <TemplateRenderer layout={parsedLayout} data={parsedMockData} />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <Code size={60} className="text-neutral-800" />
                        <p className="text-2xl font-mono text-neutral-800 uppercase tracking-widest">
                          {jsonError ? 'JSON inválido' : 'Edite o JSON para visualizar'}
                        </p>
                      </div>
                    )}

                    {/* Resolution watermark */}
                    <div className="absolute top-3 right-4 bg-black/60 px-3 py-1 text-sm font-mono text-neutral-500">
                      1920×1080
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-700 opacity-50">
            <Layout size={56} className="mb-3" />
            <p className="tracking-widest uppercase text-xs">Selecione ou crie um template</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Templates;
