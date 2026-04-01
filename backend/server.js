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

const LOG_REQUESTS = process.env.LOG_REQUESTS === '1';
if (LOG_REQUESTS) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
  });
}


const DEFAULT_CLIENT_ID = 'default';
const getClientId = (req) => {
  const header = req.headers['x-client-id'];
  const query = req.query?.client_id;
  const body = req.body?.client_id;
  const clientId = (header || query || body || DEFAULT_CLIENT_ID);
  return typeof clientId === 'string' && clientId.trim() ? clientId.trim() : DEFAULT_CLIENT_ID;
};

// DATA_DIR can be configured to a persistent volume (same as in database.js)
const _dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname);

const MEDIA_ROOT = path.join(_dataDir, 'media');
const LEGACY_UPLOAD_DIR = path.join(_dataDir, 'uploads');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(MEDIA_ROOT);
ensureDir(LEGACY_UPLOAD_DIR);

const getMediaTypeDir = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (ext.match(/\.(mp4|webm|mkv|avi|mov)$/i)) return 'videos';
  if (ext.match(/\.(jpg|jpeg|png|gif|webp|svg|json|lottie)$/i)) return 'images';
  if (ext.match(/\.(html|htm)$/i)) return 'html';
  return 'files';
};

const ensureClientMediaDirs = (clientId) => {
  ['videos', 'images', 'html', 'files'].forEach((dir) => {
    ensureDir(path.join(MEDIA_ROOT, clientId, dir));
  });
};

ensureClientMediaDirs(DEFAULT_CLIENT_ID);

// Serve static media (new + legacy)
app.use('/media', express.static(MEDIA_ROOT));
app.use('/media', express.static(LEGACY_UPLOAD_DIR));

// Setup storage for media uploads
const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = getClientId(req);
    const typeDir = getMediaTypeDir(file.originalname);
    const dest = path.join(MEDIA_ROOT, clientId, typeDir);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const uploadMedia = multer({ storage: mediaStorage });

// Setup storage for overlay image uploads
const overlayStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = getClientId(req);
    const dest = path.join(MEDIA_ROOT, clientId, 'images');
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const uploadOverlay = multer({ storage: overlayStorage });

// Initialize database
initDb();

// ===== Socket.IO Logic =====
const activePlaybacks = {};
const HEARTBEAT_INTERVAL_MS = 30000;
const OFFLINE_GRACE_SECONDS = 90;

const emitPlaylistUpdateToDevice = (deviceId) => {
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
    FROM devices d
    JOIN playlists pl ON d.playlist_id = pl.id
    JOIN playlist_items p ON p.playlist_id = pl.id
    LEFT JOIN media m ON p.media_id = m.id
    LEFT JOIN templates t ON p.template_id = t.id
    WHERE d.id = ?
    ORDER BY p.item_order ASC
  `;
  db.all(query, [deviceId], (err, rows) => {
    if (err) return;
    io.to(`device_${deviceId}`).emit('playlist:update', rows || []);
  });
};

const emitPlaylistUpdateToDevicesForPlaylist = (playlistId) => {
  db.all('SELECT id FROM devices WHERE playlist_id = ?', [playlistId], (err, rows) => {
    if (err || !rows) return;
    rows.forEach(r => emitPlaylistUpdateToDevice(r.id));
  });
};

io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  const registerDevice = (deviceId) => {
    if (!deviceId) return;
    socket.data.deviceId = deviceId;
    socket.join(`device_${deviceId}`);
    console.log(`Socket ${socket.id} registered as device_${deviceId}`);
    
    // Update status to online
    db.run('UPDATE devices SET status = "online", last_seen = CURRENT_TIMESTAMP WHERE id = ?', [deviceId]);
    io.emit('devices_updated'); // Broadcast update to admin
    emitPlaylistUpdateToDevice(deviceId);
  };

  socket.on('register_device', (deviceId) => {
    registerDevice(deviceId);
  });

  // Alternate register message format: { type: "register", deviceId: "uuid" }
  socket.on('register', (payload) => {
    registerDevice(payload?.deviceId || payload);
  });

  socket.on('heartbeat', (deviceId) => {
    const targetId = deviceId || socket.data.deviceId;
    if (!targetId) return;
    db.run('UPDATE devices SET status = "online", last_seen = CURRENT_TIMESTAMP WHERE id = ?', [targetId]);
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
    if (socket.data.deviceId) {
      db.run('UPDATE devices SET status = "offline", last_seen = CURRENT_TIMESTAMP WHERE id = ?', [socket.data.deviceId], () => {
        io.emit('devices_updated');
      });
      return;
    }
    io.emit('devices_updated');
  });
});

// Periodically mark stale devices offline
setInterval(() => {
  db.run(
    `UPDATE devices SET status = 'offline'
     WHERE last_seen < datetime('now', ?) AND status != 'offline'`,
    [`-${OFFLINE_GRACE_SECONDS} seconds`],
    () => io.emit('devices_updated')
  );
}, HEARTBEAT_INTERVAL_MS);

// ===== API ENDPOINTS =====

const ensurePlaylistClient = (playlistId, clientId, cb) => {
  if (!playlistId) return cb(null, null);
  db.get('SELECT id, client_id FROM playlists WHERE id = ?', [playlistId], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('Playlist not found'));
    if (clientId && row.client_id !== clientId) return cb(new Error('Playlist belongs to another client'));
    cb(null, row);
  });
};

const ensureDeviceClient = (deviceId, clientId, cb) => {
  db.get('SELECT id, client_id FROM devices WHERE id = ?', [deviceId], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('Device not found'));
    if (clientId && row.client_id !== clientId) return cb(new Error('Device belongs to another client'));
    cb(null, row);
  });
};

const ensureTemplateClient = (templateId, clientId, cb) => {
  if (!templateId) return cb(null, null);
  db.get('SELECT id, client_id FROM templates WHERE id = ?', [templateId], (err, row) => {
    if (err) return cb(err);
    if (!row) return cb(new Error('Template not found'));
    if (clientId && row.client_id !== clientId) return cb(new Error('Template belongs to another client'));
    cb(null, row);
  });
};

const ensureOverlayTargetClient = (targetType, targetId, clientId, cb) => {
  if (!targetType || !targetId) return cb(new Error('Invalid target'));
  if (targetType === 'device') return ensureDeviceClient(targetId, clientId, cb);
  if (targetType === 'playlist_item') {
    const query = `
      SELECT p.id, pl.client_id
      FROM playlist_items p
      JOIN playlists pl ON p.playlist_id = pl.id
      WHERE p.id = ?
    `;
    return db.get(query, [targetId], (err, row) => {
      if (err) return cb(err);
      if (!row) return cb(new Error('Playlist item not found'));
      if (clientId && row.client_id !== clientId) return cb(new Error('Playlist item belongs to another client'));
      cb(null, row);
    });
  }
  cb(null, null);
};

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'fake-jwt-token-for-now' });
  } else {
    res.status(401).json({ error: 'Senha incorreta' });
  }
});

app.get('/health', (req, res) => {
  db.get('SELECT 1 as ok', [], (err) => {
    if (err) return res.status(500).json({ ok: false });
    res.json({ ok: true, time: new Date().toISOString() });
  });
});

app.get('/api/metrics/clients', (req, res) => {
  const metrics = {};
  db.all('SELECT id, name FROM clients ORDER BY created_at DESC', [], (err, clients) => {
    if (err) return res.status(500).json({ error: err.message });
    metrics.clients = clients || [];

    db.all('SELECT client_id, COUNT(*) as count FROM devices GROUP BY client_id', [], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      metrics.devices = rows || [];

      db.all("SELECT client_id, COUNT(*) as count FROM devices WHERE status = 'online' GROUP BY client_id", [], (err3, rowsOnline) => {
        if (err3) return res.status(500).json({ error: err3.message });
        metrics.devices_online = rowsOnline || [];

        db.all('SELECT client_id, COUNT(*) as count FROM playlists GROUP BY client_id', [], (err4, rowsPlaylists) => {
          if (err4) return res.status(500).json({ error: err4.message });
          metrics.playlists = rowsPlaylists || [];

          db.all('SELECT client_id, COUNT(*) as count FROM media GROUP BY client_id', [], (err5, rowsMedia) => {
            if (err5) return res.status(500).json({ error: err5.message });
            metrics.media = rowsMedia || [];
            res.json(metrics);
          });
        });
      });
    });
  });
});

app.get('/api/metrics/clients/summary', (req, res) => {
  const sinceMinutes = Number(req.query?.since_minutes || 60);
  const window = Number.isFinite(sinceMinutes) && sinceMinutes > 0 ? sinceMinutes : 60;
  const result = { since_minutes: window };

  db.all(
    `SELECT client_id, COUNT(*) as count
     FROM devices
     WHERE last_seen >= datetime('now', ?)
     GROUP BY client_id`,
    [`-${window} minutes`],
    (err, rowsActive) => {
      if (err) return res.status(500).json({ error: err.message });
      result.devices_seen_recent = rowsActive || [];

      db.all(
        `SELECT client_id, COUNT(*) as count
         FROM devices
         GROUP BY client_id`,
        [],
        (err2, rowsTotal) => {
          if (err2) return res.status(500).json({ error: err2.message });
          result.devices_total = rowsTotal || [];
          res.json(result);
        }
      );
    }
  );
});

// Clients API
app.get('/api/clients', (req, res) => {
  db.all('SELECT * FROM clients ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/clients', (req, res) => {
  let { id, name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  if (!id || !id.trim()) {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    id = base || `client-${Date.now()}`;
  }
  db.run('INSERT INTO clients (id, name) VALUES (?, ?)', [id, name.trim()], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    ensureClientMediaDirs(id);
    res.json({ id, name: name.trim() });
  });
});

app.put('/api/clients/:id', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  db.run('UPDATE clients SET name = ? WHERE id = ?', [name.trim(), req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/clients/:id', (req, res) => {
  const clientId = req.params.id;
  if (clientId === DEFAULT_CLIENT_ID) return res.status(400).json({ error: 'Default client cannot be deleted' });

  const checks = [
    { table: 'devices', col: 'client_id' },
    { table: 'playlists', col: 'client_id' },
    { table: 'media', col: 'client_id' }
  ];
  let pending = checks.length;
  let hasData = false;

  checks.forEach(c => {
    db.get(`SELECT 1 FROM ${c.table} WHERE ${c.col} = ? LIMIT 1`, [clientId], (err, row) => {
      if (row) hasData = true;
      pending--;
      if (pending === 0) {
        if (hasData) return res.status(400).json({ error: 'Client has data and cannot be deleted' });
        db.run('DELETE FROM clients WHERE id = ?', [clientId], (delErr) => {
          if (delErr) return res.status(500).json({ error: delErr.message });
          res.json({ success: true });
        });
      }
    });
  });
});


app.get('/api/media', (req, res) => {
  const clientId = getClientId(req);
  db.all('SELECT * FROM media WHERE client_id = ? ORDER BY id DESC', [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/media/upload', uploadMedia.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const clientId = getClientId(req);
  const { originalname, filename } = req.file;
  const typeDir = getMediaTypeDir(originalname);
  const type = typeDir === 'videos' ? 'video' : (typeDir === 'html' ? 'html' : 'image');
  
  const query = `INSERT INTO media (name, filename, type, duration, path, client_id) VALUES (?, ?, ?, ?, ?, ?)`;
  const defaultDuration = type === 'video' ? 0 : 10; // Video duration could be extracted, but default to 0 to auto-play

  const mediaPath = `/media/${clientId}/${typeDir}/${filename}`;

  db.run(query, [originalname, filename, type, defaultDuration, mediaPath, clientId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, filename, type, originalname, path: mediaPath, client_id: clientId });
  });
});

app.delete('/api/media/:id', (req, res) => {
  const clientId = getClientId(req);
  db.get('SELECT filename, path FROM media WHERE id = ? AND client_id = ?', [req.params.id, clientId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Media not found' });
    const relative = row.path?.replace(/^\/media\//, '');
    const primaryPath = relative ? path.join(_dataDir, 'media', relative) : null;
    const legacyPath = path.join(LEGACY_UPLOAD_DIR, row.filename);
    const file = primaryPath && fs.existsSync(primaryPath) ? primaryPath : legacyPath;
    if (fs.existsSync(file)) fs.unlinkSync(file);
    
    db.run('DELETE FROM media WHERE id = ? AND client_id = ?', [req.params.id, clientId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });
});

// Playlists API
app.get('/api/playlists', (req, res) => {
  const clientId = getClientId(req);
  db.all('SELECT * FROM playlists WHERE client_id = ? ORDER BY id DESC', [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/playlists/:id/items', (req, res) => {
  const clientId = getClientId(req);
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
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.all(query, [req.params.id], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(rows);
    });
  });
});

app.post('/api/playlists', (req, res) => {
  const { name } = req.body;
  const clientId = getClientId(req);
  db.run('INSERT INTO playlists (name, client_id) VALUES (?, ?)', [name, clientId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, client_id: clientId });
  });
});

app.put('/api/playlists/:id', (req, res) => {
  const { name } = req.body;
  const clientId = getClientId(req);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run('UPDATE playlists SET name = ? WHERE id = ? AND client_id = ?', [name, req.params.id, clientId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      io.emit('playlist_updated', req.params.id);
      emitPlaylistUpdateToDevicesForPlaylist(req.params.id);
      res.json({ success: true, name });
    });
  });
});

app.delete('/api/playlists/:id', (req, res) => {
  const clientId = getClientId(req);
  // First, remove link from any active devices
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run('UPDATE devices SET playlist_id = NULL WHERE playlist_id = ? AND client_id = ?', [req.params.id, clientId], (err2) => {
      // Then clear all items of this playlist
      db.run('DELETE FROM playlist_items WHERE playlist_id = ? AND client_id = ?', [req.params.id, clientId], (err3) => {
        db.run('DELETE FROM device_playlists WHERE playlist_id = ?', [req.params.id]);
        // Then clear the playlist entirely
        db.run('DELETE FROM playlists WHERE id = ? AND client_id = ?', [req.params.id, clientId], (err4) => {
          if (err4) return res.status(500).json({ error: err4.message });
          // Broadcasting undefined/deletion helps clear caches
          io.emit('playlist_updated', req.params.id);
          io.emit('devices_updated');
          res.json({ success: true });
        });
      });
    });
  });
});

app.post('/api/playlists/:id/items', (req, res) => {
  const { media_id, template_id, duration, data_json } = req.body;
  const clientId = getClientId(req);
  // Automatically find the next item_order for this specific playlist
  const query = `
    INSERT INTO playlist_items (playlist_id, media_id, template_id, duration, data_json, item_order, client_id) 
    VALUES (?, ?, ?, ?, ?, (SELECT IFNULL(MAX(item_order), 0) + 1 FROM playlist_items WHERE playlist_id = ?), ?)
  `;
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    ensureTemplateClient(template_id, clientId, (tplErr) => {
      if (tplErr) return res.status(400).json({ error: tplErr.message });
      db.run(query, [req.params.id, media_id || null, template_id || null, duration || null, data_json || null, req.params.id, clientId], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        
        // Notify devices that are using this playlist
        io.emit('playlist_updated', req.params.id);
        emitPlaylistUpdateToDevicesForPlaylist(req.params.id);
        
        res.json({ success: true });
      });
    });
  });
});

app.delete('/api/playlists/:playId/items/:itemId', (req, res) => {
  const clientId = getClientId(req);
  ensurePlaylistClient(req.params.playId, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run('DELETE FROM playlist_items WHERE id = ? AND playlist_id = ? AND client_id = ?', [req.params.itemId, req.params.playId, clientId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      io.emit('playlist_updated', req.params.playId);
      emitPlaylistUpdateToDevicesForPlaylist(req.params.playId);
      res.json({ success: true });
    });
  });
});

app.put('/api/playlists/:playId/items/:itemId', (req, res) => {
  const { duration, data_json } = req.body;
  const clientId = getClientId(req);
  ensurePlaylistClient(req.params.playId, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run(
      'UPDATE playlist_items SET duration = ?, data_json = ? WHERE id = ? AND playlist_id = ? AND client_id = ?',
      [duration, data_json, req.params.itemId, req.params.playId, clientId],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        io.emit('playlist_updated', req.params.playId);
        emitPlaylistUpdateToDevicesForPlaylist(req.params.playId);
        res.json({ success: true });
      }
    );
  });
});

app.put('/api/playlists/:id/items/reorder', (req, res) => {
  const { items } = req.body;
  const clientId = getClientId(req);
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Invalid items array' });
  
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      items.forEach((itemId, index) => {
        // Re-map index (0-based) to order (1-based)
        db.run('UPDATE playlist_items SET item_order = ? WHERE id = ? AND playlist_id = ? AND client_id = ?', [index + 1, itemId, req.params.id, clientId], (err2) => {
          if (err2) console.error(`Failed to update order for item ${itemId}:`, err2.message);
        });
      });
      db.run('COMMIT', (err3) => {
      if (err3) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: err3.message });
      }
      io.emit('playlist_updated', req.params.id);
      emitPlaylistUpdateToDevicesForPlaylist(req.params.id);
      res.json({ success: true });
    });
  });
});
});

// Devices API
app.get('/api/devices', (req, res) => {
  const clientId = getClientId(req);
  db.all('SELECT * FROM devices WHERE client_id = ? ORDER BY id DESC', [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/devices', (req, res) => {
  const { name, playlist_id, orientation, resolution, transition, muted, is_playing, client_id } = req.body;
  const clientId = client_id || getClientId(req);
  ensurePlaylistClient(playlist_id, clientId, (plErr) => {
    if (plErr && playlist_id) return res.status(400).json({ error: plErr.message });
    db.run(
      'INSERT INTO devices (name, playlist_id, orientation, resolution, transition, muted, is_playing, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, playlist_id || null, orientation || 'landscape', resolution || 'auto', transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1, clientId],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (playlist_id) {
          db.run('INSERT INTO device_playlists (device_id, playlist_id) VALUES (?, ?)', [this.lastID, playlist_id]);
        }
        io.emit('devices_updated');
        res.json({ id: this.lastID, name, playlist_id, orientation, resolution, transition, client_id: clientId });
      }
    );
  });
});

app.put('/api/devices/:id', (req, res) => {
  console.log("Updating device", req.params.id, req.body);
  const { name, playlist_id, orientation, resolution, transition, muted, is_playing, client_id } = req.body;
  const clientId = getClientId(req);
  const nextClientId = client_id || clientId;

  ensureDeviceClient(req.params.id, clientId, (devErr) => {
    if (devErr) return res.status(404).json({ error: devErr.message });
    ensurePlaylistClient(playlist_id, nextClientId, (plErr) => {
      if (plErr && playlist_id) return res.status(400).json({ error: plErr.message });
      db.run(
        'UPDATE devices SET name = ?, playlist_id = ?, orientation = ?, resolution = ?, transition = ?, muted = ?, is_playing = ?, client_id = ? WHERE id = ?',
        [name, playlist_id, orientation, resolution || 'auto', transition || 'fade', muted !== undefined ? muted : 1, is_playing !== undefined ? is_playing : 1, nextClientId, req.params.id],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          db.run('DELETE FROM device_playlists WHERE device_id = ?', [req.params.id], () => {
            if (playlist_id) {
              db.run('INSERT INTO device_playlists (device_id, playlist_id) VALUES (?, ?)', [req.params.id, playlist_id]);
            }
          });
          
          // Tell this specific device it has a new configuration!
          io.to(`device_${req.params.id}`).emit('command_update', {
            playlist_id, orientation, resolution, transition, muted, is_playing
          });
          emitPlaylistUpdateToDevice(req.params.id);
          console.log('Emitted command_update to device', req.params.id);
          
          res.json({ success: true });
        }
      );
    });
  });
});

app.get('/api/devices/:id', (req, res) => {
  const clientId = req.query?.client_id || null;
  const params = clientId ? [req.params.id, clientId] : [req.params.id];
  const query = clientId ? 'SELECT * FROM devices WHERE id = ? AND client_id = ?' : 'SELECT * FROM devices WHERE id = ?';
  db.get(query, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Device not found' });
    res.json(row);
  });
});

app.delete('/api/devices/:id', (req, res) => {
  const clientId = getClientId(req);
  ensureDeviceClient(req.params.id, clientId, (devErr) => {
    if (devErr) return res.status(404).json({ error: devErr.message });
    db.run('DELETE FROM devices WHERE id = ? AND client_id = ?', [req.params.id, clientId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.run('DELETE FROM device_playlists WHERE device_id = ?', [req.params.id]);
      io.emit('devices_updated');
      res.json({ success: true });
    });
  });
});

// ===== TEMPLATES API =====
app.get('/api/templates', (req, res) => {
  const clientId = getClientId(req);
  db.all('SELECT * FROM templates WHERE client_id = ? ORDER BY created_at DESC', [clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/templates', (req, res) => {
  const clientId = getClientId(req);
  const { name, json_layout } = req.body;
  db.run('INSERT INTO templates (name, json_layout, client_id) VALUES (?, ?, ?)', [name, json_layout, clientId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, json_layout, client_id: clientId });
  });
});

app.put('/api/templates/:id', (req, res) => {
  const clientId = getClientId(req);
  const { name, json_layout } = req.body;
  ensureTemplateClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run('UPDATE templates SET name = ?, json_layout = ? WHERE id = ? AND client_id = ?', [name, json_layout, req.params.id, clientId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

app.delete('/api/templates/:id', (req, res) => {
  const clientId = getClientId(req);
  ensureTemplateClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.run('DELETE FROM templates WHERE id = ? AND client_id = ?', [req.params.id, clientId], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ success: true });
    });
  });
});

// ===== TEXT OVERLAYS API =====
app.get('/api/overlays', (req, res) => {
  const clientId = getClientId(req);
  const query = `
    SELECT o.*, t.name as template_name, t.json_layout as template_layout
    FROM text_overlays o
    LEFT JOIN templates t ON o.template_id = t.id
    LEFT JOIN devices d ON o.target_type = 'device' AND o.target_id = d.id
    LEFT JOIN playlist_items pi ON o.target_type = 'playlist_item' AND o.target_id = pi.id
    LEFT JOIN playlists pl ON pi.playlist_id = pl.id
    WHERE (
      (o.target_type = 'device' AND d.client_id = ?)
      OR (o.target_type = 'playlist_item' AND pl.client_id = ?)
    )
    ORDER BY o.created_at DESC
  `;
  db.all(query, [clientId, clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/overlays/target/:type/:id', (req, res) => {
  const clientId = getClientId(req);
  const query = `
    SELECT o.*, t.name as template_name, t.json_layout as template_layout
    FROM text_overlays o
    LEFT JOIN templates t ON o.template_id = t.id
    LEFT JOIN devices d ON o.target_type = 'device' AND o.target_id = d.id
    LEFT JOIN playlist_items pi ON o.target_type = 'playlist_item' AND o.target_id = pi.id
    LEFT JOIN playlists pl ON pi.playlist_id = pl.id
    WHERE o.target_type = ? AND o.target_id = ? AND o.is_active = 1
    AND (
      (o.target_type = 'device' AND d.client_id = ?)
      OR (o.target_type = 'playlist_item' AND pl.client_id = ?)
    )
  `;
  db.all(query, [req.params.type, req.params.id, clientId, clientId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/overlays/playlist-items/:id', (req, res) => {
  const clientId = getClientId(req);
  const query = `
    SELECT o.*, tmpl.name as template_name, tmpl.json_layout as template_layout
    FROM text_overlays o
    JOIN playlist_items p ON o.target_id = p.id
    LEFT JOIN templates tmpl ON o.template_id = tmpl.id
    WHERE o.target_type = 'playlist_item' 
    AND p.playlist_id = ? 
    AND o.is_active = 1
  `;
  ensurePlaylistClient(req.params.id, clientId, (err) => {
    if (err) return res.status(404).json({ error: err.message });
    db.all(query, [req.params.id], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(rows);
    });
  });
});

app.post('/api/overlays/upload-image', uploadOverlay.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const clientId = getClientId(req);
  const imagePath = `/media/${clientId}/images/${req.file.filename}`;
  res.json({ path: imagePath, filename: req.file.filename });
});

app.post('/api/overlays', (req, res) => {
  const {
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active, image_path, image_size,
    font_family, pos_x, pos_y, icon_name, icon_size, icon_color, template_id, data_json
  } = req.body;

  const query = `INSERT INTO text_overlays 
    (text, target_type, target_id, position, animation, font_size, font_color, bg_color, bg_blur, font_weight, text_shadow, border, duration_seconds, is_active, image_path, image_size, font_family, pos_x, pos_y, icon_name, icon_size, icon_color, template_id, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const clientId = getClientId(req);
  ensureOverlayTargetClient(target_type || 'device', target_id, clientId, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    ensureTemplateClient(template_id, clientId, (tplErr) => {
      if (tplErr) return res.status(400).json({ error: tplErr.message });
      db.run(query, [
        text || '', target_type || 'device', target_id, position || 'bottom-bar', animation || 'none',
        font_size || 24, font_color || '#FFFFFF', bg_color || '#00000080', bg_blur || 0,
        font_weight || 'normal', text_shadow || 0, border || 0, duration_seconds || 0, is_active !== undefined ? is_active : 1,
        image_path || null, image_size || 100, font_family || 'Roboto', pos_x !== undefined ? pos_x : 50, pos_y !== undefined ? pos_y : 50, icon_name || null, icon_size || 24, icon_color || '#FFFFFF', template_id || null, data_json || null
      ], function (err2) {
        if (err2) return res.status(500).json({ error: err2.message });
        io.emit('overlays_updated');
        res.json({ id: this.lastID, success: true });
      });
    });
  });
});

app.put('/api/overlays/:id', (req, res) => {
  const {
    text, target_type, target_id, position, animation,
    font_size, font_color, bg_color, bg_blur, font_weight,
    text_shadow, border, duration_seconds, is_active, image_path, image_size,
    font_family, pos_x, pos_y, icon_name, icon_size, icon_color, template_id, data_json
  } = req.body;

  const query = `UPDATE text_overlays SET 
    text = ?, target_type = ?, target_id = ?, position = ?, animation = ?,
    font_size = ?, font_color = ?, bg_color = ?, bg_blur = ?, font_weight = ?,
    text_shadow = ?, border = ?, duration_seconds = ?, is_active = ?,
    image_path = ?, image_size = ?, font_family = ?, pos_x = ?, pos_y = ?, icon_name = ?, icon_size = ?, icon_color = ?, template_id = ?, data_json = ?
    WHERE id = ?`;

  const clientId = getClientId(req);
  ensureOverlayTargetClient(target_type || 'device', target_id, clientId, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    ensureTemplateClient(template_id, clientId, (tplErr) => {
      if (tplErr) return res.status(400).json({ error: tplErr.message });
      db.run(query, [
        text, target_type, target_id, position, animation,
        font_size, font_color, bg_color, bg_blur, font_weight,
        text_shadow, border, duration_seconds, is_active,
        image_path || null, image_size || 100, font_family || 'Roboto', pos_x, pos_y, icon_name || null, icon_size || 24, icon_color || '#FFFFFF', template_id || null, data_json || null, req.params.id
      ], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        io.emit('overlays_updated');
        res.json({ success: true });
      });
    });
  });
});

app.delete('/api/overlays/:id', (req, res) => {
  const clientId = getClientId(req);
  db.get('SELECT target_type, target_id FROM text_overlays WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Overlay not found' });
    ensureOverlayTargetClient(row.target_type, row.target_id, clientId, (err2) => {
      if (err2) return res.status(400).json({ error: err2.message });
      db.run('DELETE FROM text_overlays WHERE id = ?', [req.params.id], (err3) => {
        if (err3) return res.status(500).json({ error: err3.message });
        io.emit('overlays_updated');
        res.json({ success: true });
      });
    });
  });
});

// ===== WEATHER API (Open-Meteo — free, no API key) =====
const weatherCache = new Map();
const WEATHER_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

app.get('/api/weather', async (req, res) => {
  try {
    const rawCity = (req.query.city || 'Canela,RS').trim();
    if (!rawCity || rawCity.length > 100 || /[<>{}]/.test(rawCity)) {
      return res.status(400).json({ error: 'Invalid city parameter' });
    }

    const cacheKey = `weather_${rawCity.toLowerCase()}`;
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < WEATHER_CACHE_TTL) {
      return res.json(cached.data);
    }

    // Parse "City,Region" format
    const parts = rawCity.split(',').map(s => s.trim());
    const cityName = parts[0];
    const region = parts[1] || '';

    // Step 1: Geocoding — convert city name to coordinates
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=5&language=pt`;
    const geoRes = await fetch(geoUrl);
    if (!geoRes.ok) {
      return res.status(502).json({ error: 'Geocoding service unavailable' });
    }
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: 'Cidade não encontrada' });
    }

    // Try to match the region/country if provided
    let location = geoData.results[0];
    if (region) {
      const regionUp = region.toUpperCase();
      const match = geoData.results.find(r =>
        (r.admin1 && r.admin1.toUpperCase().includes(regionUp)) ||
        (r.country_code && r.country_code.toUpperCase() === regionUp) ||
        (r.country && r.country.toUpperCase().includes(regionUp))
      );
      if (match) location = match;
    }

    // Step 2: Fetch current weather from Open-Meteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m,apparent_temperature&timezone=auto`;
    const weatherRes = await fetch(weatherUrl);
    if (!weatherRes.ok) {
      return res.status(502).json({ error: 'Weather service unavailable' });
    }
    const weatherData = await weatherRes.json();

    const current = weatherData.current || {};
    const result = {
      city: location.name,
      region: region || '',
      fullRegion: location.admin1 || '',
      country: location.country || '',
      countryCode: location.country_code || '',
      temperature: Math.round(current.temperature_2m ?? 0),
      feelsLike: Math.round(current.apparent_temperature ?? 0),
      humidity: current.relative_humidity_2m ?? null,
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      weatherCode: current.weather_code ?? null,
      updatedAt: new Date().toISOString(),
    };

    weatherCache.set(cacheKey, { data: result, timestamp: Date.now() });
    res.json(result);
  } catch (err) {
    console.error('[Weather API Error]:', err.message);
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

// ===== CONFIG EXPORT / IMPORT =====

app.get('/api/config/export', (req, res) => {
  db.serialize(() => {
    const result = {};
    const tables = ['clients', 'devices', 'playlists', 'playlist_items', 'media', 'templates', 'text_overlays', 'device_playlists'];
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
  const { devices, playlists, playlist_items, text_overlays, clients, device_playlists, templates } = req.body;

  if (!devices && !playlists) {
    return res.status(400).json({ error: 'Invalid config file.' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // Clear existing config (but keep media files records)
    db.run('DELETE FROM device_playlists');
    db.run('DELETE FROM text_overlays');
    db.run('DELETE FROM playlist_items');
    db.run('DELETE FROM playlists');
    db.run('DELETE FROM devices');
    db.run('DELETE FROM templates');
    db.run('DELETE FROM clients WHERE id != ?', [DEFAULT_CLIENT_ID]);

    // Re-insert clients
    (clients || []).forEach(c => {
      if (!c.id || c.id === DEFAULT_CLIENT_ID) return;
      db.run('INSERT INTO clients (id, name, created_at) VALUES (?, ?, ?)', [c.id, c.name, c.created_at || new Date().toISOString()]);
    });

    // Re-insert playlists
    (playlists || []).forEach(p => {
      db.run('INSERT INTO playlists (id, name, client_id) VALUES (?, ?, ?)', [p.id, p.name, p.client_id || DEFAULT_CLIENT_ID]);
    });

    // Re-insert devices
    (devices || []).forEach(d => {
      db.run(
        'INSERT INTO devices (id, name, playlist_id, orientation, resolution, transition, muted, is_playing, status, last_seen, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.name, d.playlist_id, d.orientation || 'landscape', d.resolution || 'auto', d.transition || 'fade', d.muted !== undefined ? d.muted : 1, d.is_playing !== undefined ? d.is_playing : 1, 'offline', d.last_seen, d.client_id || DEFAULT_CLIENT_ID]
      );
    });

    // Re-insert playlist items
    (playlist_items || []).forEach(i => {
      db.run(
        'INSERT INTO playlist_items (id, playlist_id, media_id, template_id, item_order, duration, data_json, client_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [i.id, i.playlist_id, i.media_id, i.template_id, i.item_order, i.duration, i.data_json, i.client_id || DEFAULT_CLIENT_ID]
      );
    });

    // Re-insert templates
    (templates || []).forEach(t => {
      db.run(
        'INSERT INTO templates (id, name, json_layout, client_id, created_at) VALUES (?, ?, ?, ?, ?)',
        [t.id, t.name, t.json_layout, t.client_id || DEFAULT_CLIENT_ID, t.created_at || new Date().toISOString()]
      );
    });

    // Re-insert overlays
    (text_overlays || []).forEach(o => {
      db.run(
        `INSERT INTO text_overlays (id, text, target_type, target_id, position, animation, font_size, font_color, bg_color, bg_blur, font_weight, text_shadow, border, duration_seconds, is_active, image_path, image_size, font_family, pos_x, pos_y, icon_name, icon_size, icon_color, template_id, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [o.id, o.text, o.target_type, o.target_id, o.position, o.animation, o.font_size, o.font_color, o.bg_color, o.bg_blur, o.font_weight, o.text_shadow, o.border, o.duration_seconds, o.is_active, o.image_path, o.image_size, o.font_family, o.pos_x, o.pos_y, o.icon_name, o.icon_size, o.icon_color, o.template_id, o.data_json]
      );
    });

    // Re-insert device playlists
    (device_playlists || []).forEach(dp => {
      db.run(
        'INSERT INTO device_playlists (id, device_id, playlist_id, assigned_at) VALUES (?, ?, ?, ?)',
        [dp.id, dp.device_id, dp.playlist_id, dp.assigned_at || new Date().toISOString()]
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
