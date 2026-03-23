const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
  db.serialize(() => {
    // Devices table
    db.run(`CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      playlist_id INTEGER,
      orientation TEXT DEFAULT 'landscape',
      transition TEXT DEFAULT 'fade',
      status TEXT DEFAULT 'offline',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gracefully add transition column if it doesn't exist (for existing DBs)
    db.run("ALTER TABLE devices ADD COLUMN transition TEXT DEFAULT 'fade'", (err) => {
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
      item_order INTEGER,
      duration INTEGER,
      FOREIGN KEY(playlist_id) REFERENCES playlists(id),
      FOREIGN KEY(media_id) REFERENCES media(id)
    )`);

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Gracefully add image columns to text_overlays
    db.run("ALTER TABLE text_overlays ADD COLUMN image_path TEXT DEFAULT NULL", (err) => {});
    db.run("ALTER TABLE text_overlays ADD COLUMN image_size INTEGER DEFAULT 100", (err) => {});
  });
};

module.exports = {
  db,
  initDb
};
