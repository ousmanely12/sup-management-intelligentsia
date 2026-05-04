const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../config/database');

const HASH_SALT = process.env.JWT_SECRET || 'sup_management_secret_key_2024';

router.use(verifyToken);
router.use(requireRole('etudiant'));

router.get('/professeurs', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { semestre, annee_academique } = req.query;

    const etudiant = await getOne(
      `SELECT id FROM etudiants WHERE user_id = $1`, [userId]
    );

    if (!etudiant) {
      return res.status(404).json({ error: 'Profil étudiant introuvable.' });
    }

    const etuId = etudiant.id;
    
    // Utiliser les paramètres fournis ou les valeurs par défaut
    const semestreFilter = semestre || 'S2';
    const anneeFilter = annee_academique || '2025-2026';

    const profs = await getAll(`
      SELECT
        p.id AS prof_id,
        u.nom, u.prenom,
        p.matiere, p.departement,
        CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END AS inscrit
      FROM professeurs p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN enrollments e
        ON e.professeur_id = p.id
        AND e.etudiant_id = $1
        AND e.semestre = $2
        AND e.annee_academique = $3
      WHERE u.actif = 1
      ORDER BY u.nom, u.prenom
    `, [etuId, semestreFilter, anneeFilter]);

    const hash = crypto.createHash('sha256')
      .update(String(etuId) + HASH_SALT)
      .digest('hex');

    for (const p of profs) {
      const eval_ = await getOne(`
        SELECT id FROM evaluations
        WHERE professeur_id = $1 AND etudiant_hash = $2
        AND semestre = $3 AND annee_academique = $4
      `, [p.prof_id, hash, semestreFilter, anneeFilter]);
      p.deja_note = eval_ ? 1 : 0;
    }

    res.json({ professeurs: profs });
  } catch (err) {
    console.error('Erreur GET professeurs:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/evaluer', async (req, res) => {
  try {
    // S'assurer que la colonne note_engagement existe
    try {
      await runQuery(`ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS note_engagement INTEGER CHECK (note_engagement BETWEEN 1 AND 5)`);
    } catch (e) { /* ignorer */ }
    
    const userId = req.user.userId;

    const etudiant = await getOne(
      `SELECT id FROM etudiants WHERE user_id = $1`, [userId]
    );

    if (!etudiant) {
      return res.status(404).json({ error: 'Profil étudiant introuvable.' });
    }

    const etuId = etudiant.id;

    const {
      professeur_id, semestre, annee_academique,
      note_clarte, note_maitrise, note_disponibilite,
      note_supports, note_ponctualite, note_engagement, commentaire
    } = req.body;

    const notesValides = [note_clarte, note_maitrise, note_disponibilite, note_supports, note_ponctualite, note_engagement];
    for (const note of notesValides) {
      if (!Number.isInteger(Number(note)) || note < 1 || note > 5) {
        return res.status(400).json({ error: 'Notes invalides (1 à 5 uniquement).' });
      }
    }

    if (commentaire && commentaire.length > 500) {
      return res.status(400).json({ error: 'Commentaire trop long (500 caractères max).' });
    }

    function sanitize(str) {
      if (!str) return str;
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    }
    const commentaireSanitise = commentaire ? sanitize(commentaire) : null;

    const inscription = await getOne(`
      SELECT id FROM enrollments
      WHERE etudiant_id = $1 AND professeur_id = $2
      AND semestre = $3 AND annee_academique = $4
    `, [etuId, professeur_id, semestre, annee_academique]);

    if (!inscription) {
      return res.status(403).json({ error: 'Ce professeur ne vous enseigne pas.' });
    }

    const etudiant_hash = crypto.createHash('sha256')
      .update(String(etuId) + HASH_SALT)
      .digest('hex');

    const existant = await getOne(`
      SELECT id FROM evaluations
      WHERE professeur_id = $1 AND etudiant_hash = $2
      AND semestre = $3 AND annee_academique = $4
    `, [professeur_id, etudiant_hash, semestre, annee_academique]);

    if (existant) {
      return res.status(409).json({ error: 'Vous avez déjà évalué ce professeur ce semestre.' });
    }

    await runQuery(`
      INSERT INTO evaluations
        (professeur_id, semestre, annee_academique, etudiant_hash,
         note_clarte, note_maitrise, note_disponibilite,
         note_supports, note_ponctualite, note_engagement, commentaire)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `, [professeur_id, semestre, annee_academique, etudiant_hash,
        note_clarte, note_maitrise, note_disponibilite,
        note_supports, note_ponctualite, note_engagement, commentaireSanitise]);

    res.json({ message: 'Évaluation enregistrée avec succès.' });
  } catch (err) {
    console.error('Erreur POST evaluer:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Route pour la mise à jour du semestre étudiant
router.post('/mettre-a-jour', async (req, res) => {
  try {
    // S'assurer que les colonnes existent (migration à la volée)
    try {
      await runQuery(`ALTER TABLE etudiants ADD COLUMN IF NOT EXISTS semestre TEXT DEFAULT 'S1'`);
      await runQuery(`ALTER TABLE etudiants ADD COLUMN IF NOT EXISTS annee_academique TEXT DEFAULT '2024-2025'`);
    } catch (e) {
      // Ignorer les erreurs si les colonnes existent déjà
    }
    
    const userId = req.user.userId;
    const { semestre, annee_academique, niveau, professeurs } = req.body;

    // Validation des entrées
    if (!semestre || !annee_academique || !niveau || !professeurs || !Array.isArray(professeurs)) {
      return res.status(400).json({ error: 'Données invalides.' });
    }

    // Validation du semestre
    if (!['S1', 'S2'].includes(semestre)) {
      return res.status(400).json({ error: 'Semestre invalide (S1 ou S2).' });
    }
    
    // Validation de l'année académique
    if (!/^\d{4}-\d{4}$/.test(annee_academique)) {
      return res.status(400).json({ error: 'Année académique invalide (format: 2024-2025).' });
    }

    if (professeurs.length === 0) {
      return res.status(400).json({ error: 'Veuillez sélectionner au moins un professeur.' });
    }

    const etudiant = await getOne(
      `SELECT id FROM etudiants WHERE user_id = $1`, [userId]
    );

    if (!etudiant) {
      return res.status(404).json({ error: 'Profil étudiant introuvable.' });
    }

    const etuId = etudiant.id;

    // Vérifier que les professeurs existent
    const profIds = professeurs.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (profIds.length === 0) {
      return res.status(400).json({ error: 'Liste de professeurs invalide.' });
    }

    const professeursExistants = await getAll(
      `SELECT id FROM professeurs WHERE id = ANY($1)`, [profIds]
    );

    if (professeursExistants.length !== profIds.length) {
      return res.status(400).json({ error: 'Un ou plusieurs professeurs sont invalides.' });
    }

    // Mettre à jour le niveau, semestre et année de l'étudiant
    await runQuery(
      `UPDATE etudiants SET niveau = $1, semestre = $2, annee_academique = $3 WHERE id = $4`,
      [niveau, semestre, annee_academique, etuId]
    );

    // Supprimer les anciennes inscriptions pour ce semestre/année
    await runQuery(
      `DELETE FROM enrollments 
       WHERE etudiant_id = $1 AND semestre = $2 AND annee_academique = $3`,
      [etuId, semestre, annee_academique]
    );

    // Inscrire l'étudiant aux nouveaux professeurs
    for (const profId of profIds) {
      await runQuery(
        `INSERT INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (etudiant_id, professeur_id, semestre, annee_academique) DO NOTHING`,
        [etuId, profId, semestre, annee_academique]
      );
    }

    res.json({ 
      message: 'Mise à jour effectuée avec succès.',
      semestre,
      annee_academique,
      niveau,
      professeursInscrits: profIds.length
    });

  } catch (err) {
    console.error('Erreur POST mettre-a-jour:', err.message);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour.' });
  }
});

module.exports = router;