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
    // Clients (tenants)
    db.run(`CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Ensure default client exists for backward compatibility
    db.run(`INSERT OR IGNORE INTO clients (id, name) VALUES ('default', 'Default')`);

    // Devices table
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_id TEXT DEFAULT 'default',
      playlist_id INTEGER,
      orientation TEXT DEFAULT 'landscape',
      resolution TEXT DEFAULT 'auto',
      transition TEXT DEFAULT 'fade',

      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gracefully add transition column if it doesn't exist (for existing DBs)
    db.run("ALTER TABLE devices ADD COLUMN transition TEXT DEFAULT 'fade'", (err) => {});
    db.run("ALTER TABLE devices ADD COLUMN resolution TEXT DEFAULT 'auto'", (err) => {});
    db.run("ALTER TABLE devices ADD COLUMN client_id TEXT DEFAULT 'default'", (err) => {});
    db.run("ALTER TABLE devices ADD COLUMN muted INTEGER DEFAULT 1", (err) => {});
    db.run("ALTER TABLE devices ADD COLUMN is_playing INTEGER DEFAULT 1", (err) => {});

    // Media table
    db.run(`CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER DEFAULT 10,
      path TEXT NOT NULL,
      client_id TEXT DEFAULT 'default'
    )`);

    // Playlists table
    db.run(`CREATE TABLE IF NOT EXISTS playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client_id TEXT DEFAULT 'default'
    )`);

    // Playlist items
    db.run(`CREATE TABLE IF NOT EXISTS playlist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playlist_id INTEGER,
      client_id TEXT DEFAULT 'default',
      media_id INTEGER,
      template_id INTEGER,
      item_order INTEGER,
      duration INTEGER,
      data_json TEXT,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(media_id) REFERENCES media(id),
      FOREIGN KEY(template_id) REFERENCES templates(id)
    )`);

    // Device playlists
    db.run(`CREATE TABLE IF NOT EXISTS device_playlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id INTEGER NOT NULL,
      playlist_id INTEGER NOT NULL,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(device_id) REFERENCES devices(id),
      FOREIGN KEY(playlist_id) REFERENCES playlists(id)
    )`);

    // Templates table
    db.run(`CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      json_layout TEXT NOT NULL,
      client_id TEXT DEFAULT 'default',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run("ALTER TABLE playlist_items ADD COLUMN template_id INTEGER", (err) => {});
    db.run("ALTER TABLE playlist_items ADD COLUMN data_json TEXT", (err) => {});
    db.run("ALTER TABLE playlist_items ADD COLUMN client_id TEXT DEFAULT 'default'", (err) => {});
    db.run("ALTER TABLE media ADD COLUMN client_id TEXT DEFAULT 'default'", (err) => {});
    db.run("ALTER TABLE playlists ADD COLUMN client_id TEXT DEFAULT 'default'", (err) => {});
    db.run("ALTER TABLE templates ADD COLUMN client_id TEXT DEFAULT 'default'", (err) => {});

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
      item_order INTEGER DEFAULT 0,
      start_time TEXT DEFAULT NULL,
      end_time TEXT DEFAULT NULL,
      start_offset INTEGER DEFAULT 0,
      end_offset INTEGER DEFAULT 0,
      image_path TEXT DEFAULT NULL,
      image_size INTEGER DEFAULT 100,
      template_id INTEGER,
      data_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(template_id) REFERENCES templates(id)
    )`);

    // Gracefully add columns to text_overlays
    db.run("ALTER TABLE text_overlays ADD COLUMN item_order INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN start_time TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN end_time TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN start_offset INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN end_offset INTEGER DEFAULT 0", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN image_path TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN image_size INTEGER DEFAULT 100", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN template_id INTEGER", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN data_json TEXT", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN font_family TEXT DEFAULT 'Roboto'", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN pos_x INTEGER DEFAULT 50", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN pos_y INTEGER DEFAULT 50", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_name TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_size INTEGER DEFAULT 24", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN icon_color TEXT DEFAULT '#FFFFFF'", (err) => {});

    // Backfill default client_id for legacy rows
    db.run("UPDATE devices SET client_id = 'default' WHERE client_id IS NULL", () => {});
    db.run("UPDATE media SET client_id = 'default' WHERE client_id IS NULL", () => {});
    db.run("UPDATE playlists SET client_id = 'default' WHERE client_id IS NULL", () => {});
    db.run("UPDATE playlist_items SET client_id = 'default' WHERE client_id IS NULL", () => {});
    db.run("UPDATE templates SET client_id = 'default' WHERE client_id IS NULL", () => {});

    // Performance Optimization Indexes
    db.run("CREATE INDEX IF NOT EXISTS idx_devices_playlist ON devices(playlist_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON playlist_items(playlist_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlist_items_order ON playlist_items(item_order)");
    db.run("CREATE INDEX IF NOT EXISTS idx_media_type ON media(type)");
    db.run("CREATE INDEX IF NOT EXISTS idx_overlays_target ON text_overlays(target_type, target_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_devices_client ON devices(client_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlists_client ON playlists(client_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_media_client ON media(client_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_playlist_items_client ON playlist_items(client_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_templates_client ON templates(client_id)");
    db.run("CREATE INDEX IF NOT EXISTS idx_overlays_order ON text_overlays(item_order)");

    // App Settings table (Key/Value store for configurations like AI System Prompt)
    db.run(`CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assistant_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT 'default',
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assistant_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id TEXT DEFAULT 'default',
      fact_key TEXT NOT NULL,
      fact_value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(client_id, fact_key)
    )`);

    db.run("CREATE INDEX IF NOT EXISTS idx_assistant_memory_client_created ON assistant_memory(client_id, created_at)");
    db.run("CREATE INDEX IF NOT EXISTS idx_assistant_facts_client ON assistant_facts(client_id)");

  });
};

module.exports = {
  db,
  initDb
};
