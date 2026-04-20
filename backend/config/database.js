const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'supmanagement.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

let db;

function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) return reject(err);
      if (process.env.NODE_ENV !== 'production') {
        console.log('Base de données connectée.');
      }
    });

    db.run('PRAGMA foreign_keys = ON');

    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    db.serialize(() => {
      statements.forEach(stmt => {
        db.run(stmt, (err) => {
          if (err && !err.message.includes('already exists')) {
            console.error('Erreur schema:', err.message);
          }
        });
      });
      db.run('SELECT 1', () => resolve(db));
    });
  });
}

function getDatabase() {
  return db;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = { initDatabase, getDatabase, runQuery, getOne, getAll };