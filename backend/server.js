const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db, initDb } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// Serve static media
app.use('/media', express.static(UPLOAD_DIR));

// Setup storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

// Initialize database
initDb();

// ===== Socket.IO Logic =====
const activePlaybacks = {};

io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  socket.on('register_device', (deviceId) => {
    socket.join(`device_${deviceId}`);
    console.log(`Socket ${socket.id} registered as device_${deviceId}`);
    
    // Update status to online
    db.run('UPDATE devices SET status = "online", last_seen = CURRENT_TIMESTAMP WHERE id = ?', [deviceId]);
    io.emit('devices_updated'); // Broadcast update to admin
  });

  socket.on('now_playing', (data) => {
    const { deviceId, media } = data;
    activePlaybacks[deviceId] = media;
    io.emit('dashboard_update', activePlaybacks);
  });

  socket.on('request_dashboard', () => {
    socket.emit('dashboard_update', activePlaybacks);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
    io.emit('devices_updated');
  });
});

// ===== API ENDPOINTS =====

app.get('/api/media', (req, res) => {
  db.all('SELECT * FROM media ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/media/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { originalname, filename } = req.file;
  const isVideo = originalname.match(/\.(mp4|webm|mkv)$/i);
  const type = isVideo ? 'video' : 'image';
  
  const query = `INSERT INTO media (name, filename, type, duration, path) VALUES (?, ?, ?, ?, ?)`;
  const defaultDuration = isVideo ? 0 : 10; // Video duration could be extracted, but default to 0 to auto-play

  db.run(query, [originalname, filename, type, defaultDuration, `/media/${filename}`], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, filename, type, originalname, path: `/media/${filename}` });
  });
});

app.delete('/api/media/:id', (req, res) => {
  db.get('SELECT filename FROM media WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Media not found' });
    const file = path.join(UPLOAD_DIR, row.filename);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    
    db.run('DELETE FROM media WHERE id = ?', [req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Playlists API
app.get('/api/playlists', (req, res) => {
  db.all('SELECT * FROM playlists', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/playlists/:id/items', (req, res) => {
  const query = `
    SELECT p.id, p.item_order, p.duration, m.filename, m.type, m.path, m.duration as default_duration, m.name
    FROM playlist_items p
    JOIN media m ON p.media_id = m.id
    WHERE p.playlist_id = ?
    ORDER BY p.item_order ASC
  `;
  db.all(query, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/playlists', (req, res) => {
  const { name } = req.body;
  db.run('INSERT INTO playlists (name) VALUES (?)', [name], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name });
  });
});

app.put('/api/playlists/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  db.run('UPDATE playlists SET name = ? WHERE id = ?', [name, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('playlist_updated', req.params.id);
    res.json({ success: true, name });
  });
});

app.delete('/api/playlists/:id', (req, res) => {
  // First, remove link from any active devices
  db.run('UPDATE devices SET playlist_id = NULL WHERE playlist_id = ?', [req.params.id], (err) => {
    // Then clear all items of this playlist
    db.run('DELETE FROM playlist_items WHERE playlist_id = ?', [req.params.id], (err) => {
      // Then clear the playlist entirely
      db.run('DELETE FROM playlists WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        // Broadcasting undefined/deletion helps clear caches
        io.emit('playlist_updated', req.params.id);
        io.emit('devices_updated');
        res.json({ success: true });
      });
    });
  });
});

app.post('/api/playlists/:id/items', (req, res) => {
  const { media_id, item_order, duration } = req.body;
  const query = 'INSERT INTO playlist_items (playlist_id, media_id, item_order, duration) VALUES (?, ?, ?, ?)';
  db.run(query, [req.params.id, media_id, item_order, duration || null], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    
    // Notify devices that are using this playlist
    io.emit('playlist_updated', req.params.id);
    
    res.json({ success: true });
  });
});

app.delete('/api/playlists/:playId/items/:itemId', (req, res) => {
  db.run('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ?', [req.params.itemId, req.params.playId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('playlist_updated', req.params.playId);
    res.json({ success: true });
  });
});

app.put('/api/playlists/:id/items/reorder', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    items.forEach((itemId, index) => {
      db.run('UPDATE playlist_items SET item_order = ? WHERE id = ? AND playlist_id = ?', [index + 1, itemId, req.params.id]);
    });
    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      io.emit('playlist_updated', req.params.id);
      res.json({ success: true });
    });
  });
});

// Devices API
app.get('/api/devices', (req, res) => {
  db.all('SELECT * FROM devices', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/devices', (req, res) => {
  const { name, playlist_id, orientation, transition, muted, is_playing } = req.body;
  db.run(
    'INSERT INTO devices (name, playlist_id, orientation, transition, muted, is_playing) VALUES (?, ?, ?, ?, ?, ?)',
    [name, playlist_id || null, orientation || 'landscape', transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('devices_updated');
      res.json({ id: this.lastID, name, playlist_id, orientation, transition });
    }
  );
});

app.put('/api/devices/:id', (req, res) => {
  console.log("Updating device", req.params.id, req.body);
  const { name, playlist_id, orientation, transition, muted, is_playing } = req.body;
  
  db.run(
    'UPDATE devices SET name = ?, playlist_id = ?, orientation = ?, transition = ?, muted = ?, is_playing = ? WHERE id = ?',
    [name, playlist_id, orientation, transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Tell this specific device it has a new configuration!
      io.to(`device_${req.params.id}`).emit('command_update', {
        playlist_id, orientation, transition, muted, is_playing
      });
      console.log('Emitted command_update to device', req.params.id);
      
      res.json({ success: true });
    }
  );
});

app.get('/api/devices/:id', (req, res) => {
  db.get('SELECT * FROM devices WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Device not found' });
    res.json(row);
  });
});

app.delete('/api/devices/:id', (req, res) => {
  db.run('DELETE FROM devices WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('devices_updated');
    res.json({ success: true });
  });
});

// ===== TEXT OVERLAYS API =====
app.get('/api/overlays', (req, res) => {
  db.all('SELECT * FROM text_overlays ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/overlays/target/:type/:id', (req, res) => {
  db.all(
    'SELECT * FROM text_overlays WHERE target_type = ? AND target_id = ? AND is_active = 1',
    [req.params.type, req.params.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

app.post('/api/overlays/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const imagePath = `/media/${req.file.filename}`;
  res.json({ path: imagePath, filename: req.file.filename });
});

app.post('/api/overlays', (req, res) => {
  const {
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active, image_path, image_size
  } = req.body;

  const query = `INSERT INTO text_overlays 
    (text, target_type, target_id, position, animation, font_size, font_color, bg_color, bg_blur, font_weight, text_shadow, border, duration_seconds, is_active, image_path, image_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    text || '', target_type || 'device', target_id, position || 'bottom-bar', animation || 'none',
    font_size || 24, font_color || '#FFFFFF', bg_color || '#00000080', bg_blur || 0,
    font_weight || 'normal', text_shadow || 0, border || 0, duration_seconds || 0, is_active !== undefined ? is_active : 1,
    image_path || null, image_size || 100
  ], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('overlays_updated');
    res.json({ id: this.lastID, success: true });
  });
});

app.put('/api/overlays/:id', (req, res) => {
  const {
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active, image_path, image_size
  } = req.body;

  const query = `UPDATE text_overlays SET 
    text = ?, target_type = ?, target_id = ?, position = ?, animation = ?,
    font_size = ?, font_color = ?, bg_color = ?, bg_blur = ?, font_weight = ?,
    text_shadow = ?, border = ?, duration_seconds = ?, is_active = ?,
    image_path = ?, image_size = ?
    WHERE id = ?`;

  db.run(query, [
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active,
    image_path || null, image_size || 100, req.params.id
  ], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('overlays_updated');
    res.json({ success: true });
  });
});

app.delete('/api/overlays/:id', (req, res) => {
  db.run('DELETE FROM text_overlays WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    io.emit('overlays_updated');
    res.json({ success: true });
  });
});


const FRONTEND_DIR = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIR)) {
  console.log('Production mode detected, serving compiled frontend...');
  app.use(express.static(FRONTEND_DIR));

  // Catch-all route to serve index.html for React Router compatibility
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
