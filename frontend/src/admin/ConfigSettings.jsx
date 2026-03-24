import { useState, useRef } from 'react';
import { Download, Upload, ShieldCheck, AlertTriangle, Settings, CheckCircle, XCircle } from 'lucide-react';
import { API_BASE } from '../api';

const ConfigSettings = () => {
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message: string }
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const url = `${API_BASE}/api/config/export`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatus({ type: 'success', message: 'Exportação iniciada. Verifique seus downloads.' });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImporting(true);
    setStatus(null);

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!config.version || (!config.devices && !config.playlists)) {
        throw new Error('Arquivo inválido. Certifique-se de usar um arquivo exportado por este sistema.');
      }

      const res = await fetch(`${API_BASE}/api/config/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Erro desconhecido ao importar.');

      const { imported } = data;
      setStatus({
        type: 'success',
        message: `Importado com sucesso: ${imported.devices} dispositivos, ${imported.playlists} playlists, ${imported.overlays} overlays.`
      });

      // Reload after a moment to reflect changes
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="font-mono text-neutral-300 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 border-b border-neutral-800 pb-4">
        <Settings className="text-amber-500" size={28} />
        <h2 className="text-2xl font-bold tracking-widest text-neutral-100 uppercase">
          SYS_CONFIG
        </h2>
      </div>

      {/* Status Message */}
      {status && (
        <div className={`flex items-center gap-3 p-4 border mb-6 text-sm transition-all ${
          status.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {status.type === 'success'
            ? <CheckCircle size={18} className="shrink-0" />
            : <XCircle size={18} className="shrink-0" />
          }
          {status.message}
        </div>
      )}

      {/* Export Block */}
      <div className="bg-[#0a0a0a] border border-neutral-800 p-6 mb-4 group hover:border-amber-500/40 transition-colors">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Download size={16} className="text-amber-500" />
              EXPORT_CONFIG
            </h3>
            <p className="text-xs text-neutral-500">
              Exporta todos os dispositivos, playlists, itens e overlays como um arquivo JSON.
              As mídias em si não são incluídas, apenas as referências.
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-amber-600/20 text-amber-400 border border-amber-600/50 hover:bg-amber-500 hover:text-[#050505] px-5 py-2.5 transition-all uppercase text-xs font-bold tracking-widest"
        >
          <Download size={16} />
          DOWNLOAD CONFIG.JSON
        </button>
      </div>

      {/* Import Block */}
      <div className="bg-[#0a0a0a] border border-neutral-800 p-6 group hover:border-cyan-500/40 transition-colors">
        <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-widest mb-1 flex items-center gap-2">
          <Upload size={16} className="text-cyan-500" />
          IMPORT_CONFIG
        </h3>
        <p className="text-xs text-neutral-500 mb-4">
          Restaura uma configuração exportada anteriormente.
          <strong className="text-amber-500"> Atenção: isto substitui todos os dados atuais.</strong>
        </p>

        <div className="flex items-center gap-3 p-3 bg-amber-500/5 border border-amber-800/50 mb-4 text-xs text-amber-500">
          <AlertTriangle size={14} className="shrink-0" />
          Esta operação irá apagar dispositivos, playlists e overlays existentes antes de importar.
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/50 hover:bg-cyan-500 hover:text-[#050505] px-5 py-2.5 transition-all uppercase text-xs font-bold tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={16} />
          {importing ? 'IMPORTANDO...' : 'SELECIONAR ARQUIVO'}
        </button>
      </div>

      {/* Notes */}
      <div className="mt-6 p-4 bg-neutral-900/50 border border-neutral-800 text-xs text-neutral-600 space-y-1">
        <div className="flex items-center gap-2 text-neutral-500 mb-2">
          <ShieldCheck size={14} />
          <span className="uppercase tracking-widest">Notas</span>
        </div>
        <p>• Os arquivos de mídia (vídeos, imagens) <strong>não são incluídos</strong> na exportação. Você deve copiá-los manualmente se mudar o servidor.</p>
        <p>• Após importar, a página será recarregada automaticamente.</p>
        <p>• Guarde o arquivo exportado em local seguro para uso como backup.</p>
      </div>
    </div>
  );
};

export default ConfigSettings;
