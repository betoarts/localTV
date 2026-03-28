const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

console.log('--- PLAYLIST ITEMS ORDER ---');
db.all('SELECT id, playlist_id, item_order, media_id, template_id FROM playlist_items ORDER BY playlist_id, item_order', [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  rows.forEach(row => {
    console.log(`ID: ${row.id}, PL_ID: ${row.playlist_id}, Order: ${row.item_order}, Media: ${row.media_id}, Template: ${row.template_id}`);
  });
  db.close();
});
