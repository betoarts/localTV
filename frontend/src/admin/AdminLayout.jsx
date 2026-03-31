import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Film, MonitorPlay, RadioReceiver, Activity, Type, LogOut, Settings, Menu, X, Layout, Users } from 'lucide-react';
import { getClients, getClientId, setClientId } from '../api';


const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [activeClient, setActiveClient] = useState(getClientId());

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => setClients([{ id: 'default', name: 'Default' }]));
  }, []);

  const handleClientChange = (e) => {
    const next = e.target.value;
    setActiveClient(next);
    setClientId(next);
    window.location.reload();
  };

  const navItems = [
    { name: 'DASHBOARD', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { name: 'CLIENTS', path: '/admin/clients', icon: <Users size={18} /> },
    { name: 'MEDIA_LIB', path: '/admin/media', icon: <Film size={18} /> },
    { name: 'PLAYLISTS', path: '/admin/playlists', icon: <MonitorPlay size={18} /> },
    { name: 'TEMPLATES', path: '/admin/templates', icon: <Layout size={18} /> },
    { name: 'DEVICES', path: '/admin/devices', icon: <RadioReceiver size={18} /> },
    { name: 'OVERLAYS', path: '/admin/overlays', icon: <Type size={18} /> },
    { name: 'SETTINGS', path: '/admin/settings', icon: <Settings size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Mobile Header */}
      <header className="md:hidden h-16 flex items-center justify-between px-4 bg-[#0a0a0a] border-b border-neutral-800 z-50">
        <div className="flex items-center gap-2">
          <Activity className="text-green-500" size={20} />
          <h1 className="text-xs font-mono font-bold text-neutral-100 tracking-widest">
            CONTROL_TV<span className="text-green-500">_</span>
          </h1>
        </div>
        <button 
          onClick={toggleSidebar}
          className="p-2 text-neutral-400 hover:text-white"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar - Command Center Style */}
      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col z-50 transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:flex'}
      `}>

        {/* Brand Header - Desktop Only */}
        <div className="hidden md:flex h-20 items-center px-6 border-b border-neutral-800 bg-[#050505]">
          <div className="flex items-center gap-3">
            <Activity className="text-green-500 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" size={24} />
            <h1 className="text-sm font-mono font-bold text-neutral-100 tracking-widest">
              CONTROL_TV<span className="text-green-500">_</span>
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-4">
          <div className="text-[10px] font-mono text-neutral-300 uppercase tracking-widest mb-4 px-2">
            Primary Modules
          </div>

          <div className="mb-4 px-2">
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mb-2">
              Active Client
            </div>
            <select
              value={activeClient}
              onChange={handleClientChange}
              className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-mono tracking-widest uppercase px-2 py-2 focus:outline-none focus:border-green-500"
            >
              {(Array.isArray(clients) && clients.length ? clients : [{ id: 'default', name: 'Default' }]).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin');

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={closeSidebar}
                className={`relative flex items-center gap-3 px-4 py-3 text-sm font-mono tracking-wide transition-all duration-200 group ${isActive
                  ? 'text-green-400 bg-neutral-900/50'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/30'
                  }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                )}

                <span className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </span>
                {item.name}

                {isActive && (
                  <span className="absolute right-4 w-1.5 h-1.5 bg-green-500 rounded-none animate-pulse" />
                )}
              </Link>
            );
          })}

          <div className="mt-auto pt-6 border-t border-neutral-800/30 px-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-2 py-3 text-sm font-mono text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-200 rounded-lg group"
            >
              <LogOut size={18} className="group-hover:scale-110 transition-transform" />
              LOGOUT_CMD
            </button>
          </div>
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-neutral-800 bg-[#050505]">
          <div className="flex items-center justify-between text-xs font-mono text-red-500">
            <span>STATUS: <span className="text-green-500">ONLINE</span></span>
            <span>HMOURA_TV</span>
          </div>
        </div>
      </aside>


      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neutral-900/20 via-[#050505] to-[#050505]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDIiLz4KPC9zdmc+')] opacity-20 z-0 pointer-events-none" />
        <div className="flex-1 overflow-y-auto relative z-10 p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
