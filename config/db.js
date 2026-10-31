
const path = require("path");

// Database file location
const dbPath = path.join(__dirname, "..", "database.sqlite");

let db;

try {
  // Check if built-in node:sqlite is available (native in Node 22+, avoids native addon issues on Windows)
  const { DatabaseSync } = require("node:sqlite");
  db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  console.log("SQLite connected successfully via native node:sqlite!");
} catch (nativeErr) {
  try {
    // Fallback to better-sqlite3
    const Database = require("better-sqlite3");
    db = new Database(dbPath);
    db.pragma("foreign_keys = ON");
    console.log("SQLite connected successfully via better-sqlite3!");
  } catch (betterErr) {
    console.error("Failed to initialize SQLite database:", betterErr);
    throw betterErr;
  }
}

// Create users table if it doesn't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        high_score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

// Safe migration for existing databases missing games_played column
try {
  db.exec("ALTER TABLE users ADD COLUMN games_played INTEGER DEFAULT 0;");
} catch (ignored) {
  // Column already exists
}

module.exports = db;

