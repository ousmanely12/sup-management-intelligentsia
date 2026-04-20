require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { initDatabase, runQuery, getOne } = require('./config/database');

async function seed() {
  console.log('Initialisation de la base de données SMI...');
  await initDatabase();

  const hash = await bcrypt.hash('test1234', 12);
  const SEMESTRE_L1_L2 = 'S2';
  const ANNEE = '2025-2026';

  // ── Helpers ──────────────────────────────────────────
  async function insertUser(nom, prenom, email, role) {
    const r = await runQuery(
      `INSERT OR IGNORE INTO users (nom, prenom, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [nom, prenom, email, hash, role]
    );
    if (r.lastID) return r.lastID;
    const u = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    return u.id;
  }

  async function insertProf(userId, matiere, dept) {
    const r = await runQuery(
      `INSERT OR IGNORE INTO professeurs (user_id, matiere, departement) VALUES (?, ?, ?)`,
      [userId, matiere, dept]
    );
    if (r.lastID) return r.lastID;
    const p = await getOne(`SELECT id FROM professeurs WHERE user_id = ?`, [userId]);
    return p.id;
  }

  async function insertEtu(userId, num, filiere, niveau) {
    const r = await runQuery(
      `INSERT OR IGNORE INTO etudiants (user_id, numero_etudiant, filiere, niveau) VALUES (?, ?, ?, ?)`,
      [userId, num, filiere, niveau]
    );
    if (r.lastID) return r.lastID;
    const e = await getOne(`SELECT id FROM etudiants WHERE user_id = ?`, [userId]);
    return e.id;
  }

  async function enroll(etuId, profId, semestre) {
    await runQuery(
      `INSERT OR IGNORE INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
       VALUES (?, ?, ?, ?)`,
      [etuId, profId, semestre, ANNEE]
    );
  }

  // ── Admin ─────────────────────────────────────────────
  await insertUser('Admin', 'Système', 'admin@smi.sn', 'admin');
  console.log('Admin créé');

  // ── PROFESSEURS ───────────────────────────────────────
  // On regroupe les profs qui enseignent plusieurs matières
  // sous leur matière principale — l'admin pourra ajouter les autres

  const uBa = await insertUser('Ba', 'Arona', 'arona.ba@smi.sn', 'professeur');
  const uDiallo = await insertUser('Diallo', 'Mr', 'diallo@smi.sn', 'professeur');
  const uDiopLibasse = await insertUser('Diop', 'Libasse', 'libasse.diop@smi.sn', 'professeur');
  const uDiopEco = await insertUser('Diop', 'Mr', 'diop.eco@smi.sn', 'professeur');
  const uNaelMagath = await insertUser('Nael', 'Magath', 'magath.nael@smi.sn', 'professeur');
  const uNaelPere = await insertUser('Nael', 'Mr', 'nael@smi.sn', 'professeur');
  const uFall = await insertUser('Fall', 'Mr', 'fall@smi.sn', 'professeur');
  const uSow = await insertUser('Sow', 'Mr', 'sow@smi.sn', 'professeur');
  const uKaire = await insertUser('Kairé', 'Mr', 'kaire@smi.sn', 'professeur');
  const uCisse = await insertUser('Cissé', 'Mme', 'cisse@smi.sn', 'professeur');
  const uFaye = await insertUser('Faye', 'Mr', 'faye@smi.sn', 'professeur');
  const uNdiaye = await insertUser('Ndiaye', 'Mr', 'ndiaye@smi.sn', 'professeur');
  const uDiene = await insertUser('Diene', 'Mr', 'diene@smi.sn', 'professeur');

  // Profils professeurs
  const pBa           = await insertProf(uBa, 'Comptabilité Générale / Comptabilité Gestion / Fiscalité', 'Comptabilité');
  const pDiallo       = await insertProf(uDiallo, 'Statistiques & Probabilités', 'Mathématiques');
  const pDiopLibasse  = await insertProf(uDiopLibasse, 'HTML CSS / SIG / VBA Excel & PowerPoint', 'Informatique');
  const pDiopEco      = await insertProf(uDiopEco, 'Économie / Microéconomie / Organisation des Entreprises', 'Économie');
  const pNaelMagath   = await insertProf(uNaelMagath, 'Algorithme & Structure des Données / Analyse SI', 'Informatique');
  const pNaelPere     = await insertProf(uNaelPere, 'Mathématiques Financières / Financement', 'Mathématiques');
  const pFall         = await insertProf(uFall, 'Management / Marketing Stratégique', 'Management');
  const pSow          = await insertProf(uSow, "Technique d'Expression Française", 'Langue');
  const pKaire        = await insertProf(uKaire, 'Technique de Communication / Droit des Affaires', 'Droit');
  const pCisse        = await insertProf(uCisse, 'Développement Personnel', 'Développement');
  const pFaye         = await insertProf(uFaye, 'Comptabilité des Sociétés', 'Comptabilité');
  const pNdiaye       = await insertProf(uNdiaye, 'Douane', 'Commerce');
  const pDiene        = await insertProf(uDiene, 'Normalisation Qualité', 'Qualité');

  console.log('Professeurs créés');

  console.log('\n✓ Base de données SMI prête !');
  console.log('\nCompte admin :');
  console.log('  Admin → admin@smi.sn / test1234');
  console.log('\n⚠️  Changez le mot de passe admin après le premier login !');
  console.log('Code inscription étudiants : SMI-2025');
  
  // Code d'inscription par défaut
await runQuery(
  `INSERT OR IGNORE INTO codes_inscription (code, description, max_usage)
   VALUES (?, ?, ?)`,
  ['SMI-2025', "Code d'inscription année 2025-2026", 999]
);
console.log("Code d'inscription : SMI-2025");

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });