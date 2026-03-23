import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import MediaLibrary from './admin/MediaLibrary';
import Playlists from './admin/Playlists';
import Devices from './admin/Devices';
import TextOverlays from './admin/TextOverlays';
import Player from './player/Player';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="playlists" element={<Playlists />} />
          <Route path="devices" element={<Devices />} />
          <Route path="overlays" element={<TextOverlays />} />
        </Route>

        {/* Player Route */}
        <Route path="/player/:deviceId" element={<Player />} />
      </Routes>
    </Router>
  );
}

export default App;
