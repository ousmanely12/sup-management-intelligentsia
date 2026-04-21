-- Table des utilisateurs (étudiants, profs, admin)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('etudiant', 'professeur', 'admin')),
  actif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des professeurs (infos pédagogiques)
CREATE TABLE IF NOT EXISTS professeurs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  matiere TEXT NOT NULL,
  departement TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des étudiants
CREATE TABLE IF NOT EXISTS etudiants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  numero_etudiant TEXT UNIQUE NOT NULL,
  filiere TEXT NOT NULL,
  niveau TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table des inscriptions : quel étudiant suit quel professeur
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etudiant_id INTEGER NOT NULL,
  professeur_id INTEGER NOT NULL,
  semestre TEXT NOT NULL,
  annee_academique TEXT NOT NULL,
  UNIQUE(etudiant_id, professeur_id, semestre, annee_academique),
  FOREIGN KEY (etudiant_id) REFERENCES etudiants(id) ON DELETE CASCADE,
  FOREIGN KEY (professeur_id) REFERENCES professeurs(id) ON DELETE CASCADE
);

-- Table des évaluations (anonymisées)
-- IMPORTANT : on stocke un hash de l'identité étudiant, pas son ID direct
CREATE TABLE IF NOT EXISTS evaluations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  professeur_id INTEGER NOT NULL,
  semestre TEXT NOT NULL,
  annee_academique TEXT NOT NULL,
  -- Hash anonyme pour empêcher les doublons sans révéler l'identité
  etudiant_hash TEXT NOT NULL,
  -- Critères notés de 1 à 5
  note_clarte INTEGER NOT NULL CHECK(note_clarte BETWEEN 1 AND 5),
  note_maitrise INTEGER NOT NULL CHECK(note_maitrise BETWEEN 1 AND 5),
  note_disponibilite INTEGER NOT NULL CHECK(note_disponibilite BETWEEN 1 AND 5),
  note_supports INTEGER NOT NULL CHECK(note_supports BETWEEN 1 AND 5),
  note_ponctualite INTEGER NOT NULL CHECK(note_ponctualite BETWEEN 1 AND 5),
  commentaire TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(professeur_id, etudiant_hash, semestre, annee_academique),
  FOREIGN KEY (professeur_id) REFERENCES professeurs(id) ON DELETE CASCADE
);

-- Table des codes d'inscription
CREATE TABLE IF NOT EXISTS codes_inscription (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  actif INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER DEFAULT 999,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parametres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cle TEXT UNIQUE NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
-- Index pour accélérer les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_evaluations_prof ON evaluations(professeur_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_etudiant ON enrollments(etudiant_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_prof ON enrollments(professeur_id);