import { useState, useEffect } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../api';
import { Plus, Trash2, Edit2, Save, X, Layout, Code, Play } from 'lucide-react';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({ name: '', json_layout: '' });

  const defaultLayout = {
    elements: [
      {
        type: "text",
        content: "Aviso Importante",
        x: 100,
        y: 80,
        fontSize: 60,
        color: "#ffffff"
      }
    ]
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    getTemplates().then(data => {
      if (Array.isArray(data)) {
        setTemplates(data);
      } else {
        console.error("Templates API returned non-array data:", data);
        setTemplates([]);
      }
    }).catch(err => {
      console.error("Templates load error:", err);
      setTemplates([]);
    });
  };

  const handleEdit = (t) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, json_layout: t.json_layout });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormData({ name: 'Novo Template', json_layout: JSON.stringify(defaultLayout, null, 2) });
  };

  const handleSave = async (e) => {
    e.preventDefault();
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
      alert('Erro ao salvar template. Verifique o JSON.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este template?')) return;
    try {
      await deleteTemplate(id);
      loadTemplates();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir template.');
    }
  };

  return (
    <div className="flex flex-col h-full font-mono text-neutral-300">
      <div className="flex items-center justify-between mb-8 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <Layout className="text-green-500" size={24} />
          <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
            Template_Registry
          </h2>
        </div>
        <button
          onClick={handleCreate}
          className="bg-green-600/20 text-green-500 border border-green-600/50 hover:bg-green-500 hover:text-[#050505] px-4 py-2 transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <Plus size={16} /> NEW_TEMPLATE
        </button>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Templates List */}
        <div className="w-1/3 bg-[#0a0a0a] border border-neutral-800 overflow-y-auto p-4">
          <div className="text-[10px] text-neutral-500 mb-4 tracking-widest uppercase">Available_Systems</div>
          <div className="space-y-2">
            {Array.isArray(templates) && templates.map((t) => (
              <div 
                key={t.id} 
                className={`group flex items-center justify-between p-3 border transition-colors cursor-pointer ${
                  editingTemplate?.id === t.id ? 'border-green-500 bg-green-500/10' : 'border-neutral-800 hover:border-neutral-700 bg-[#050505]'
                }`}
                onClick={() => handleEdit(t)}
              >
                <div className="flex items-center gap-3">
                  <Code size={16} className={editingTemplate?.id === t.id ? 'text-green-500' : 'text-neutral-600'} />
                  <span className="text-xs uppercase font-bold">{t.name}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                  className="text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 bg-[#0a0a0a] border border-neutral-800 flex flex-col overflow-hidden">
          {(editingTemplate || isCreating) ? (
            <form onSubmit={handleSave} className="flex flex-col h-full">
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-[#050505]">
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-transparent border-b border-neutral-700 text-neutral-100 focus:outline-none focus:border-green-500 uppercase font-bold px-2 py-1"
                  placeholder="TEMPLATE_NAME"
                />
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => { setEditingTemplate(null); setIsCreating(false); }}
                    className="p-2 text-neutral-500 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                  <button 
                    type="submit"
                    className="bg-green-500 text-[#050505] px-4 py-1 text-xs font-bold flex items-center gap-2 hover:bg-green-400"
                  >
                    <Save size={16} /> SAVE_CHANGES
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4 relative">
                 <div className="absolute top-2 right-6 text-[10px] text-green-500/50 z-10 font-mono flex items-center gap-1">
                   <Code size={10} /> JSON_MODE
                 </div>
                 <textarea
                   value={formData.json_layout}
                   onChange={(e) => setFormData({ ...formData, json_layout: e.target.value })}
                   className="w-full h-full bg-[#050505] border border-neutral-800 text-green-500 p-4 font-mono text-xs focus:outline-none focus:border-green-500/50 resize-none rounded-none"
                   spellCheck="false"
                 />
              </div>
            </form>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-neutral-600 opacity-50">
              <Layout size={64} className="mb-4" />
              <p className="tracking-widest uppercase text-sm">Select system for configuration</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Templates;
