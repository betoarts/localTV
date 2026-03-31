import { useEffect, useState } from 'react';
import { getClients, createClient, updateClient, deleteClient } from '../api';
import { Users, Plus, Trash2, Edit2, Save, X } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const loadClients = () => {
    getClients().then(setClients).catch(console.error);
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    try {
      await createClient({ id: newClientId.trim() || undefined, name: newClientName.trim() });
      setNewClientName('');
      setNewClientId('');
      loadClients();
    } catch (err) {
      console.error(err);
      alert('Error creating client');
    }
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    try {
      await updateClient(id, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
      loadClients();
    } catch (err) {
      console.error(err);
      alert('Error updating client');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete client? This will fail if it has data.')) return;
    try {
      await deleteClient(id);
      loadClients();
    } catch (err) {
      console.error(err);
      alert('Error deleting client');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Users className="text-green-500" size={18} />
        <h2 className="text-sm font-mono tracking-widest uppercase text-neutral-200">Clients</h2>
      </div>

      <form onSubmit={handleCreate} className="bg-[#0a0a0a] border border-neutral-800 p-4 flex flex-col sm:flex-row gap-3">
        <input
          className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-200 uppercase tracking-widest focus:outline-none focus:border-green-500"
          placeholder="Client name"
          value={newClientName}
          onChange={(e) => setNewClientName(e.target.value)}
        />
        <input
          className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-200 uppercase tracking-widest focus:outline-none focus:border-green-500"
          placeholder="Client id (optional)"
          value={newClientId}
          onChange={(e) => setNewClientId(e.target.value)}
        />
        <button className="bg-neutral-900 border border-neutral-800 px-4 py-2 text-xs font-mono uppercase tracking-widest text-green-500 hover:border-green-500 flex items-center gap-2">
          <Plus size={14} /> Create
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(Array.isArray(clients) ? clients : []).map((client) => (
          <div key={client.id} className="bg-[#0a0a0a] border border-neutral-800 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              {editingId === client.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="flex-1 bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs font-mono text-neutral-200 uppercase tracking-widest focus:outline-none focus:border-green-500"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <button type="button" onClick={() => handleUpdate(client.id)} className="text-green-500 p-2">
                    <Save size={14} />
                  </button>
                  <button type="button" onClick={() => { setEditingId(null); setEditingName(''); }} className="text-neutral-500 p-2">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="text-xs font-mono text-neutral-200 uppercase tracking-widest">{client.name}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">ID: {client.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingId(client.id); setEditingName(client.name); }}
                      className="text-neutral-500 hover:text-cyan-400 p-2"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={client.id === 'default'}
                      onClick={() => handleDelete(client.id)}
                      className={`p-2 ${client.id === 'default' ? 'text-neutral-700' : 'text-neutral-500 hover:text-red-400'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Clients;
