const Database = require('better-sqlite3');
const db = new Database('task-manager.db');
const users = require("./users");

// Create users table
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  role TEXT NOT NULL
);`);

// Create tasks table
db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignTo TEXT NOT NULL,
  taskName TEXT NOT NULL,
  taskDesc TEXT,
  start TEXT NOT NULL,
  end TEXT NOT NULL,
  status TEXT DEFAULT 'assigned',
  FOREIGN KEY(assignTo) REFERENCES users(username)
);`);

const insert = db.prepare("INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)");
users.forEach(u => insert.run(u.username, u.password, u.role));

console.log("✅ Tables created and users loaded.");