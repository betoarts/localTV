/**
 * Fix device IDs - resets the auto-increment sequence
 * and renumbers existing devices starting from 1.
 * Run with: node fix-device-ids.js  (inside the backend/ folder)
 */
const path   = require('path');
const fs     = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(__dirname);

const dbPath = path.join(DATA_DIR, 'data.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ Banco não encontrado em:', dbPath);
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);
console.log('📂 Banco:', dbPath);

db.serialize(() => {
  db.all('SELECT id, name FROM devices ORDER BY id', [], (err, rows) => {
    if (err) { console.error(err); process.exit(1); }

    console.log('\n🔍 Antes:');
    rows.forEach(r => console.log(`  ID ${r.id} → ${r.name}`));

    if (rows.length === 0) {
      console.log('Nenhum dispositivo. Resetando sequência...');
      db.run('DELETE FROM sqlite_sequence WHERE name = "devices"', () => {
        console.log('✅ Sequência resetada. Próximo ID será 1.');
        db.close();
      });
      return;
    }

    db.run('BEGIN TRANSACTION');

    // Step 1: move to negative IDs to avoid UNIQUE collisions
    rows.forEach(r => db.run('UPDATE devices SET id = ? WHERE id = ?', [-r.id, r.id]));

    // Step 2: reassign sequential IDs starting from 1
    const idMap = {};
    rows.forEach((r, i) => {
      idMap[r.id] = i + 1;
      db.run('UPDATE devices SET id = ? WHERE id = ?', [i + 1, -r.id]);
      // Fix overlay references
      db.run(
        'UPDATE text_overlays SET target_id = ? WHERE target_type = "device" AND target_id = ?',
        [i + 1, r.id]
      );
    });

    // Step 3: reset auto-increment counter
    const maxId = rows.length;
    db.run('DELETE FROM sqlite_sequence WHERE name = "devices"');
    db.run('INSERT INTO sqlite_sequence (name, seq) VALUES ("devices", ?)', [maxId]);

    db.run('COMMIT', (commitErr) => {
      if (commitErr) {
        console.error('❌', commitErr.message);
        db.run('ROLLBACK');
        db.close();
        return;
      }
      db.all('SELECT id, name FROM devices ORDER BY id', [], (e2, final) => {
        console.log('\n✅ Depois:');
        final.forEach(r => console.log(`  ID ${r.id} → ${r.name}`));
        console.log(`\n🔢 Próximo ID será: ${maxId + 1}`);
        db.close();
      });
    });
  });
});
