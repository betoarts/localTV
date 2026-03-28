const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data.db');
db.all('SELECT id, text, pos_x, pos_y FROM text_overlays', (err, rows) => {
  if (err) console.error(err);
  console.log(JSON.stringify(rows, null, 2));
  db.close();
});
