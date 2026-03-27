const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

console.log('--- CHECKING FOR ORDER COLLISIONS ---');
db.all(`
  SELECT playlist_id, item_order, COUNT(*) as count 
  FROM playlist_items 
  GROUP BY playlist_id, item_order 
  HAVING count > 1
`, [], (err, rows) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (rows.length === 0) {
    console.log('No collisions found.');
  } else {
    rows.forEach(row => {
      console.log(`Playlist ${row.playlist_id} has ${row.count} items with order ${row.item_order}`);
    });
  }
  db.close();
});
