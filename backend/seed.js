const path = require('path');
const fs = require('fs');
const { db, initDb } = require('./database');

// Wait a bit to ensure initDb creates tables if they don't exist
setTimeout(() => {
  db.serialize(() => {
    console.log("Seeding example data...");
    
    // Create an empty dummy video file and an image file in uploads to prevent 404s
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
    
    const sampleImgPath = path.join(uploadsDir, 'sample.jpg');
    const sampleVidPath = path.join(uploadsDir, 'sample.mp4');
    
    if (!fs.existsSync(sampleImgPath)) fs.writeFileSync(sampleImgPath, '');
    if (!fs.existsSync(sampleVidPath)) fs.writeFileSync(sampleVidPath, '');

    db.run("INSERT INTO media (name, filename, type, duration, path) VALUES ('Sample Image', 'sample.jpg', 'image', 10, '/media/sample.jpg')");
    db.run("INSERT INTO media (name, filename, type, duration, path) VALUES ('Sample Video', 'sample.mp4', 'video', 0, '/media/sample.mp4')");
    
    db.run("INSERT INTO playlists (name) VALUES ('Main Playlist')");
    
    // We assume media IDs are 1 and 2, and playlist ID is 1
    db.run("INSERT INTO playlist_items (playlist_id, media_id, item_order, duration) VALUES (1, 1, 1, 10)");
    db.run("INSERT INTO playlist_items (playlist_id, media_id, item_order, duration) VALUES (1, 2, 2, 0)");
    
    db.run("INSERT INTO devices (name, playlist_id, orientation) VALUES ('TV Recepção', 1, 'landscape')");

    console.log("Seed completed! You now have 1 Device, 1 Playlist, and 2 Media items.");
  });
}, 500);
