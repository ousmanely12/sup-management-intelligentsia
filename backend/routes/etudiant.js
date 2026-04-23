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

    const etudiant = await getOne(
      `SELECT id FROM etudiants WHERE user_id = $1`, [userId]
    );

    if (!etudiant) {
      return res.status(404).json({ error: 'Profil étudiant introuvable.' });
    }

    const etuId = etudiant.id;

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
        AND e.semestre = 'S2'
        AND e.annee_academique = '2025-2026'
      WHERE u.actif = 1
      ORDER BY u.nom, u.prenom
    `, [etuId]);

    const hash = crypto.createHash('sha256')
      .update(String(etuId) + HASH_SALT)
      .digest('hex');

    for (const p of profs) {
      const eval_ = await getOne(`
        SELECT id FROM evaluations
        WHERE professeur_id = $1 AND etudiant_hash = $2
        AND semestre = 'S2' AND annee_academique = '2025-2026'
      `, [p.prof_id, hash]);
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
      note_supports, note_ponctualite, commentaire
    } = req.body;

    const notesValides = [note_clarte, note_maitrise, note_disponibilite, note_supports, note_ponctualite];
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
         note_supports, note_ponctualite, commentaire)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [professeur_id, semestre, annee_academique, etudiant_hash,
        note_clarte, note_maitrise, note_disponibilite,
        note_supports, note_ponctualite, commentaireSanitise]);

    res.json({ message: 'Évaluation enregistrée avec succès.' });
  } catch (err) {
    console.error('Erreur POST evaluer:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;