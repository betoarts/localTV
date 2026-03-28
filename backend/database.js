const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DATA_DIR can be set to an external persistent volume on the server.
// Default: inside the backend folder (works for local dev).
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const dbPath = path.join(DATA_DIR, 'data.db');
const db = new sqlite3.Database(dbPath);


const initDb = () => {
  db.serialize(() => {
    // Devices table
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      playlist_id INTEGER,
      orientation TEXT DEFAULT 'landscape',
      resolution TEXT DEFAULT 'auto',
      transition TEXT DEFAULT 'fade',

      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gracefully add transition column if it doesn't exist (for existing DBs)
    db.run("ALTER TABLE devices ADD COLUMN transition TEXT DEFAULT 'fade'", (err) => {
      // Ignore error if column already exists
    });

    db.run("ALTER TABLE devices ADD COLUMN resolution TEXT DEFAULT 'auto'", (err) => {
      // Ignore error if column already exists
    });


    // Gracefully add muted column 
    db.run("ALTER TABLE devices ADD COLUMN muted INTEGER DEFAULT 1", (err) => {
      // Ignore error if column already exists
    });

    // Gracefully add is_playing column 
    db.run("ALTER TABLE devices ADD COLUMN is_playing INTEGER DEFAULT 1", (err) => {
      // Ignore error if column already exists
    });

    // Media table
    db.run(`CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER DEFAULT 10,
      path TEXT NOT NULL
    )`);

    // Playlists table
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )`);

    // Playlist items
    db.run(`CREATE TABLE IF NOT EXISTS playlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER,
      media_id INTEGER,
      template_id INTEGER,
      item_order INTEGER,
      duration INTEGER,
      data_json TEXT,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(media_id) REFERENCES media(id),
      FOREIGN KEY(template_id) REFERENCES templates(id)
    )`);

    // Templates table
    db.run(`CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      json_layout TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gracefully add template_id and data_json columns to playlist_items if they don't exist
    db.run("ALTER TABLE playlist_items ADD COLUMN template_id INTEGER", (err) => {});
    db.run("ALTER TABLE playlist_items ADD COLUMN data_json TEXT", (err) => {});

    // Text Overlays table
    db.run(`CREATE TABLE IF NOT EXISTS text_overlays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      target_type TEXT NOT NULL DEFAULT 'device',
      target_id INTEGER NOT NULL,
      position TEXT DEFAULT 'bottom-bar',
      animation TEXT DEFAULT 'none',
      font_size INTEGER DEFAULT 24,
      font_color TEXT DEFAULT '#FFFFFF',
      bg_color TEXT DEFAULT '#00000080',
      bg_blur INTEGER DEFAULT 0,
      font_weight TEXT DEFAULT 'normal',
      text_shadow INTEGER DEFAULT 0,
      border INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      font_family TEXT DEFAULT 'Roboto',
      pos_x INTEGER DEFAULT 50,
      pos_y INTEGER DEFAULT 50,
      icon_name TEXT DEFAULT NULL,
      icon_size INTEGER DEFAULT 24,
      icon_color TEXT DEFAULT '#FFFFFF',
      template_id INTEGER,
      data_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(template_id) REFERENCES templates(id)
    )`);

    // Gracefully add image columns to text_overlays
    db.run("ALTER TABLE text_overlays ADD COLUMN image_path TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN image_size INTEGER DEFAULT 100", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN template_id INTEGER", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN data_json TEXT", (err) => {});

    // Gracefully add new feature columns
    db.run("ALTER TABLE text_overlays ADD COLUMN font_family TEXT DEFAULT 'Roboto'", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN pos_x INTEGER DEFAULT 50", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN pos_y INTEGER DEFAULT 50", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_name TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_size INTEGER DEFAULT 24", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_color TEXT DEFAULT '#FFFFFF'", (err) => {});

    // --- Performance Optimization Indexes ---
    db.run("CREATE INDEX IF NOT EXISTS idx_devices_playlist ON devices(playlist_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON playlist_items(item_order)");
    db.run("CREATE INDEX IF NOT EXISTS idx_media_type ON media(type)");
    db.run("CREATE INDEX IF NOT EXISTS idx_overlays_target ON text_overlays(target_type, target_id)");

  });
};

module.exports = {
  db,
  initDb
};
