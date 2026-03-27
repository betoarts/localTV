const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

console.log('--- REPAIRING ALL PLAYLIST ORDERS ---');

db.all('SELECT id FROM playlists', [], (err, playlists) => {
  if (err) throw err;
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    playlists.forEach(pl => {
      db.all('SELECT id FROM playlist_items WHERE playlist_id = ? ORDER BY item_order ASC, id ASC', [pl.id], (err, items) => {
        if (err) return;
        items.forEach((item, index) => {
          db.run('UPDATE playlist_items SET item_order = ? WHERE id = ?', [index + 1, item.id]);
        });
        console.log(`Playlist ${pl.id}: Repaired ${items.length} items.`);
      });
    });
    
    db.run('COMMIT', (err) => {
      if (err) console.error('Repair failed:', err);
      else console.log('Repair completed successfully.');
      db.close();
    });
  });
});
