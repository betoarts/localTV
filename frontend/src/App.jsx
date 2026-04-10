import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load admin components to reduce initial bundle
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const Clients = lazy(() => import('./admin/Clients'));
const MediaLibrary = lazy(() => import('./admin/MediaLibrary'));
const Playlists = lazy(() => import('./admin/Playlists'));
const Devices = lazy(() => import('./admin/Devices'));
const TextOverlays = lazy(() => import('./admin/TextOverlays'));
const Templates = lazy(() => import('./admin/Templates'));
const ConfigSettings = lazy(() => import('./admin/ConfigSettings'));
const AIAssistantConfig = lazy(() => import('./admin/AIAssistantConfig'));
const Login = lazy(() => import('./admin/Login'));

// Player is the most critical route, could be preloaded or kept static
// but lazy loading also helps isolation.
import Player from './player/Player';
import AssistantPage from './player/AssistantPage';

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-neutral-800 border-t-green-500 rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="media" element={<MediaLibrary />} />
              <Route path="playlists" element={<Playlists />} />
              <Route path="templates" element={<Templates />} />
              <Route path="devices" element={<Devices />} />
              <Route path="overlays" element={<TextOverlays />} />
              <Route path="settings" element={<ConfigSettings />} />
              <Route path="assistant-config" element={<AIAssistantConfig />} />
            </Route>
          </Route>

          {/* Player Route - Not Protected */}
          <Route path="/player/:deviceId" element={<Player />} />

          {/* Assistant Standalone — Tablet */}
          <Route path="/assistant" element={<AssistantPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
