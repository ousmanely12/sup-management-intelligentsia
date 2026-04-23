require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nom TEXT NOT NULL,
        prenom TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('etudiant', 'professeur', 'admin')),
        actif INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS professeurs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        matiere TEXT NOT NULL,
        departement TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS etudiants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        numero_etudiant TEXT UNIQUE NOT NULL,
        filiere TEXT NOT NULL,
        niveau TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id SERIAL PRIMARY KEY,
        etudiant_id INTEGER NOT NULL REFERENCES etudiants(id) ON DELETE CASCADE,
        professeur_id INTEGER NOT NULL REFERENCES professeurs(id) ON DELETE CASCADE,
        semestre TEXT NOT NULL,
        annee_academique TEXT NOT NULL,
        UNIQUE(etudiant_id, professeur_id, semestre, annee_academique)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS evaluations (
        id SERIAL PRIMARY KEY,
        professeur_id INTEGER NOT NULL REFERENCES professeurs(id) ON DELETE CASCADE,
        semestre TEXT NOT NULL,
        annee_academique TEXT NOT NULL,
        etudiant_hash TEXT NOT NULL,
        note_clarte INTEGER NOT NULL CHECK(note_clarte BETWEEN 1 AND 5),
        note_maitrise INTEGER NOT NULL CHECK(note_maitrise BETWEEN 1 AND 5),
        note_disponibilite INTEGER NOT NULL CHECK(note_disponibilite BETWEEN 1 AND 5),
        note_supports INTEGER NOT NULL CHECK(note_supports BETWEEN 1 AND 5),
        note_ponctualite INTEGER NOT NULL CHECK(note_ponctualite BETWEEN 1 AND 5),
        commentaire TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(professeur_id, etudiant_hash, semestre, annee_academique)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS codes_inscription (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        description TEXT,
        actif INTEGER DEFAULT 1,
        usage_count INTEGER DEFAULT 0,
        max_usage INTEGER DEFAULT 999,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Base de données PostgreSQL initialisée.');
  } finally {
    client.release();
  }
}

async function runQuery(sql, params = []) {
  let paramIndex = 0;
  const convertedSql = sql.replace(/\?/g, () => '$' + (++paramIndex));
  const result = await pool.query(convertedSql, params);
  return {
    lastID: result.rows[0]?.id || null,
    changes: result.rowCount
  };
}

async function getOne(sql, params = []) {
  let paramIndex = 0;
  const convertedSql = sql.replace(/\?/g, () => '$' + (++paramIndex));
  const result = await pool.query(convertedSql, params);
  return result.rows[0] || null;
}

async function getAll(sql, params = []) {
  let paramIndex = 0;
  const convertedSql = sql.replace(/\?/g, () => '$' + (++paramIndex));
  const result = await pool.query(convertedSql, params);
  return result.rows;
}
module.exports = { initDatabase, runQuery, getOne, getAll };