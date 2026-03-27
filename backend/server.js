const express = require('express');
const compression = require('compression');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { db, initDb } = require('./database');

const app = express();
app.use(compression());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


// DATA_DIR can be configured to a persistent volume (same as in database.js)
const _dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname);

const UPLOAD_DIR = path.join(_dataDir, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'fake-jwt-token-for-now' });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});


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
    SELECT p.id, p.item_order, p.duration, p.data_json,
           m.filename as media_filename, m.type as media_type, m.path as path, m.name as media_name,
           t.name as template_name, t.json_layout as template_layout,
           CASE 
             WHEN p.template_id IS NOT NULL THEN 'template'
             ELSE m.type 
           END as type,
           CASE
             WHEN p.template_id IS NOT NULL THEN t.name
             ELSE m.name
           END as name
    FROM playlist_items p
    LEFT JOIN media m ON p.media_id = m.id
    LEFT JOIN templates t ON p.template_id = t.id
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
  const { media_id, template_id, duration, data_json } = req.body;
  // Automatically find the next item_order for this specific playlist
  const query = `
    INSERT INTO playlist_items (playlist_id, media_id, template_id, duration, data_json, item_order) 
    VALUES (?, ?, ?, ?, ?, (SELECT IFNULL(MAX(item_order), 0) + 1 FROM playlist_items WHERE playlist_id = ?))
  `;
  db.run(query, [req.params.id, media_id || null, template_id || null, duration || null, data_json || null, req.params.id], function (err) {
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

app.put('/api/playlists/:playId/items/:itemId', (req, res) => {
  const { duration, data_json } = req.body;
  db.run(
    'UPDATE playlist_items SET duration = ?, data_json = ? WHERE id = ? AND playlist_id = ?',
    [duration, data_json, req.params.itemId, req.params.playId],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('playlist_updated', req.params.playId);
      res.json({ success: true });
    }
  );
});

app.put('/api/playlists/:id/items/reorder', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    items.forEach((itemId, index) => {
      // Re-map index (0-based) to order (1-based)
      db.run('UPDATE playlist_items SET item_order = ? WHERE id = ? AND playlist_id = ?', [index + 1, itemId, req.params.id], (err) => {
        if (err) console.error(`Failed to update order for item ${itemId}:`, err.message);
      });
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
  const { name, playlist_id, orientation, resolution, transition, muted, is_playing } = req.body;
  db.run(
    'INSERT INTO devices (name, playlist_id, orientation, resolution, transition, muted, is_playing) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [name, playlist_id || null, orientation || 'landscape', resolution || 'auto', transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      io.emit('devices_updated');
      res.json({ id: this.lastID, name, playlist_id, orientation, resolution, transition });

    }
  );
});

app.put('/api/devices/:id', (req, res) => {
  console.log("Updating device", req.params.id, req.body);
  const { name, playlist_id, orientation, resolution, transition, muted, is_playing } = req.body;
  
  db.run(
    'UPDATE devices SET name = ?, playlist_id = ?, orientation = ?, resolution = ?, transition = ?, muted = ?, is_playing = ? WHERE id = ?',
    [name, playlist_id, orientation, resolution || 'auto', transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      
      // Tell this specific device it has a new configuration!
      io.to(`device_${req.params.id}`).emit('command_update', {
        playlist_id, orientation, resolution, transition, muted, is_playing
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

// ===== TEMPLATES API =====
app.get('/api/templates', (req, res) => {
  db.all('SELECT * FROM templates ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/templates', (req, res) => {
  const { name, json_layout } = req.body;
  db.run('INSERT INTO templates (name, json_layout) VALUES (?, ?)', [name, json_layout], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, json_layout });
  });
});

app.put('/api/templates/:id', (req, res) => {
  const { name, json_layout } = req.body;
  db.run('UPDATE templates SET name = ?, json_layout = ? WHERE id = ?', [name, json_layout, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/templates/:id', (req, res) => {
  db.run('DELETE FROM templates WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ===== TEXT OVERLAYS API =====
app.get('/api/overlays', (req, res) => {
  const query = `
    SELECT o.*, t.name as template_name, t.json_layout as template_layout
    FROM text_overlays o
    LEFT JOIN templates t ON o.template_id = t.id
    ORDER BY o.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/overlays/target/:type/:id', (req, res) => {
  const query = `
    SELECT o.*, t.name as template_name, t.json_layout as template_layout
    FROM text_overlays o
    LEFT JOIN templates t ON o.template_id = t.id
    WHERE o.target_type = ? AND o.target_id = ? AND o.is_active = 1
  `;
  db.all(query, [req.params.type, req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
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
    text_shadow, border, duration_seconds, is_active, image_path, image_size,
    template_id, data_json
  } = req.body;

  const query = `INSERT INTO text_overlays 
    (text, target_type, target_id, position, animation, font_size, font_color, bg_color, bg_blur, font_weight, text_shadow, border, duration_seconds, is_active, image_path, image_size, template_id, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  db.run(query, [
    text || '', target_type || 'device', target_id, position || 'bottom-bar', animation || 'none',
    font_size || 24, font_color || '#FFFFFF', bg_color || '#00000080', bg_blur || 0,
    font_weight || 'normal', text_shadow || 0, border || 0, duration_seconds || 0, is_active !== undefined ? is_active : 1,
    image_path || null, image_size || 100, template_id || null, data_json || null
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
    text_shadow, border, duration_seconds, is_active, image_path, image_size,
    template_id, data_json
  } = req.body;

  const query = `UPDATE text_overlays SET 
    text = ?, target_type = ?, target_id = ?, position = ?, animation = ?,
    font_size = ?, font_color = ?, bg_color = ?, bg_blur = ?, font_weight = ?,
    text_shadow = ?, border = ?, duration_seconds = ?, is_active = ?,
    image_path = ?, image_size = ?, template_id = ?, data_json = ?
    WHERE id = ?`;

  db.run(query, [
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active,
    image_path || null, image_size || 100, template_id || null, data_json || null, req.params.id
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

// ===== CONFIG EXPORT / IMPORT =====

app.get('/api/config/export', (req, res) => {
  db.serialize(() => {
    const result = {};
    const tables = ['devices', 'playlists', 'playlist_items', 'media', 'templates', 'text_overlays'];
    let done = 0;

    tables.forEach(table => {
      db.all(`SELECT * FROM ${table}`, [], (err, rows) => {
        result[table] = err ? [] : rows;
        done++;
        if (done === tables.length) {
          const now = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          res.setHeader('Content-Disposition', `attachment; filename="localtv-config-${now}.json"`);
          res.setHeader('Content-Type', 'application/json');
          res.json({ version: 1, exported_at: new Date().toISOString(), ...result });
        }
      });
    });
  });
});

app.post('/api/config/import', (req, res) => {
  const { devices, playlists, playlist_items, text_overlays } = req.body;

  if (!devices && !playlists) {
    return res.status(400).json({ error: 'Invalid config file.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Clear existing config (but keep media files records)
    db.run('DELETE FROM text_overlays');
    db.run('DELETE FROM playlist_items');
    db.run('DELETE FROM playlists');
    db.run('DELETE FROM devices');

    // Re-insert playlists
    (playlists || []).forEach(p => {
      db.run('INSERT INTO playlists (id, name) VALUES (?, ?)', [p.id, p.name]);
    });

    // Re-insert devices
    (devices || []).forEach(d => {
      db.run(
        'INSERT INTO devices (id, name, playlist_id, orientation, resolution, transition, muted, is_playing, status, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.name, d.playlist_id, d.orientation || 'landscape', d.resolution || 'auto', d.transition || 'fade', d.muted !== undefined ? d.muted : 1, d.is_playing !== undefined ? d.is_playing : 1, 'offline', d.last_seen]
      );
    });

    // Re-insert playlist items
    (playlist_items || []).forEach(i => {
      db.run(
        'INSERT INTO playlist_items (id, playlist_id, media_id, template_id, item_order, duration, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [i.id, i.playlist_id, i.media_id, i.template_id, i.item_order, i.duration, i.data_json]
      );
    });

    // Re-insert templates
    (req.body.templates || []).forEach(t => {
      db.run(
        'INSERT INTO templates (id, name, json_layout) VALUES (?, ?, ?)',
        [t.id, t.name, t.json_layout]
      );
    });

    // Re-insert overlays
    (text_overlays || []).forEach(o => {
      db.run(
        `INSERT INTO text_overlays (id, text, target_type, target_id, position, animation, font_size, font_color, bg_color, bg_blur, font_weight, text_shadow, border, duration_seconds, is_active, image_path, image_size, template_id, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, o.text, o.target_type, o.target_id, o.position, o.animation, o.font_size, o.font_color, o.bg_color, o.bg_blur, o.font_weight, o.text_shadow, o.border, o.duration_seconds, o.is_active, o.image_path, o.image_size, o.template_id, o.data_json]
      );
    });

    db.run('COMMIT', (err) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err.message });
      }
      io.emit('devices_updated');
      res.json({ success: true, imported: { devices: (devices||[]).length, playlists: (playlists||[]).length, overlays: (text_overlays||[]).length } });
    });
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
