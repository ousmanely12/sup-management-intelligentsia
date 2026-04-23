require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { initDatabase, runQuery, getOne } = require('./config/database');

async function seed() {
  console.log('Initialisation de la base de données SMI...');
  await initDatabase();

  const hash = await bcrypt.hash('test1234', 12);
  const ANNEE = '2025-2026';

  async function insertUser(nom, prenom, email, role) {
    await runQuery(
      `INSERT INTO users (nom, prenom, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING`,
      [nom, prenom, email, hash, role]
    );
    const u = await getOne(`SELECT id FROM users WHERE email = $1`, [email]);
    return u.id;
  }

  async function insertProf(userId, matiere, dept) {
    await runQuery(
      `INSERT INTO professeurs (user_id, matiere, departement)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, matiere, dept]
    );
    const p = await getOne(`SELECT id FROM professeurs WHERE user_id = $1`, [userId]);
    return p.id;
  }

  async function enroll(etuId, profId, semestre) {
    await runQuery(
      `INSERT INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [etuId, profId, semestre, ANNEE]
    );
  }

  // Admin
  await insertUser('Admin', 'Système', 'admin@smi.sn', 'admin');

  // Professeurs
  const uBa          = await insertUser('Ba', 'Arona', 'arona.ba@smi.sn', 'professeur');
  const uDiallo      = await insertUser('Diallo', 'Mr', 'diallo@smi.sn', 'professeur');
  const uDiopLibasse = await insertUser('Diop', 'Libasse', 'libasse.diop@smi.sn', 'professeur');
  const uDiopEco     = await insertUser('Diop', 'Mr', 'diop.eco@smi.sn', 'professeur');
  const uNaelMagath  = await insertUser('Nael', 'Magath', 'magath.nael@smi.sn', 'professeur');
  const uNaelPere    = await insertUser('Nael', 'Mr', 'nael@smi.sn', 'professeur');
  const uFall        = await insertUser('Fall', 'Mr', 'fall@smi.sn', 'professeur');
  const uSow         = await insertUser('Sow', 'Mr', 'sow@smi.sn', 'professeur');
  const uKaire       = await insertUser('Kairé', 'Mr', 'kaire@smi.sn', 'professeur');
  const uCisse       = await insertUser('Cissé', 'Mme', 'cisse@smi.sn', 'professeur');
  const uFaye        = await insertUser('Faye', 'Mr', 'faye@smi.sn', 'professeur');
  const uNdiaye      = await insertUser('Ndiaye', 'Mr', 'ndiaye@smi.sn', 'professeur');
  const uDiene       = await insertUser('Diene', 'Mr', 'diene@smi.sn', 'professeur');
  const uDiouf       = await insertUser('Diouf', 'Mr', 'diouf@smi.sn', 'professeur');
  const uPouye       = await insertUser('Pouye', 'Mr', 'pouye@smi.sn', 'professeur');

  // Profils professeurs
  const pBa          = await insertProf(uBa, 'Comptabilité Générale / Comptabilité Gestion / Fiscalité / Contrôle de Gestion / Analyse Financière', 'Comptabilité');
  const pDiallo      = await insertProf(uDiallo, 'Statistiques & Probabilités / Statistiques Descriptives', 'Mathématiques');
  const pDiopLibasse = await insertProf(uDiopLibasse, 'HTML CSS / SIG / VBA Excel & PowerPoint / Système d\'Information', 'Informatique');
  const pDiopEco     = await insertProf(uDiopEco, 'Économie / Microéconomie / Organisation des Entreprises', 'Économie');
  const pNaelMagath  = await insertProf(uNaelMagath, 'Algorithme & Structure des Données / Analyse SI / JavaScript / Base de Données', 'Informatique');
  const pNaelPere    = await insertProf(uNaelPere, 'Mathématiques Financières / Financement / Organisation Comptable', 'Mathématiques');
  const pFall        = await insertProf(uFall, 'Management / Marketing Stratégique', 'Management');
  const pSow         = await insertProf(uSow, 'Technique d\'Expression Française', 'Langue');
  const pKaire       = await insertProf(uKaire, 'Technique de Communication / Droit des Affaires', 'Droit');
  const pCisse       = await insertProf(uCisse, 'Développement Personnel', 'Développement');
  const pFaye        = await insertProf(uFaye, 'Comptabilité des Sociétés / Restructuration d\'Entreprise', 'Comptabilité');
  const pNdiaye      = await insertProf(uNdiaye, 'Douane', 'Commerce');
  const pDiene       = await insertProf(uDiene, 'Normalisation Qualité', 'Qualité');
  const pDiouf       = await insertProf(uDiouf, 'Gestion des Ressources Humaines', 'Management');
  const pPouye       = await insertProf(uPouye, 'Droit du Travail', 'Droit');

  console.log('Professeurs créés');

  // Code d'inscription
  await runQuery(
    `INSERT INTO codes_inscription (code, description, max_usage)
     VALUES ($1, $2, $3)
     ON CONFLICT (code) DO NOTHING`,
    ['SMI-2025', 'Code d\'inscription année 2025-2026', 999]
  );

  console.log('\n✓ Base de données SMI prête !');
  console.log('\nCompte admin :');
  console.log('  Admin → admin@smi.sn / test1234');
  console.log('\n⚠️  Changez le mot de passe admin après le premier login !');
  console.log('Code inscription étudiants : SMI-2025');

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });