import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, MonitorPlay, Film, RadioReceiver, Activity, Type } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();

  const navItems = [
    { name: 'DASHBOARD', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { name: 'MEDIA_LIB', path: '/admin/media', icon: <Film size={18} /> },
    { name: 'PLAYLISTS', path: '/admin/playlists', icon: <MonitorPlay size={18} /> },
    { name: 'DEVICES', path: '/admin/devices', icon: <RadioReceiver size={18} /> },
    { name: 'OVERLAYS', path: '/admin/overlays', icon: <Type size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-300 flex overflow-hidden font-sans">
      {/* Sidebar - Command Center Style */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-neutral-800 flex flex-col relative z-10">

        {/* Brand Header */}
        <div className="h-20 flex items-center px-6 border-b border-neutral-800 bg-[#050505]">
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

          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/admin');

            return (
              <Link
                key={item.name}
                to={item.path}
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
        <div className="flex-1 overflow-y-auto relative z-10 p-6 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
