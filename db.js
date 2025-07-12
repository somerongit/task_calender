const Database = require('better-sqlite3');
const db = new Database('task-manager.db');
module.exports = db;