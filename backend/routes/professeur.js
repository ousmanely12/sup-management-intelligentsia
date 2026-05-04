const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getOne, getAll } = require('../config/database');

router.use(verifyToken);
router.use(requireRole('professeur'));

router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { semestre, annee_academique } = req.query;

    const prof = await getOne(
      `SELECT id FROM professeurs WHERE user_id = $1`, [userId]
    );

    if (!prof) {
      return res.status(404).json({ error: 'Profil professeur introuvable.' });
    }

    const profId = prof.id;
    
    // Utiliser les paramètres fournis ou les valeurs par défaut
    const semestreFilter = semestre || 'S2';
    const anneeFilter = annee_academique || '2025-2026';

    const stats = await getOne(`
      SELECT
        COUNT(*) AS total_evaluations,
        ROUND(AVG((note_clarte + note_maitrise + note_disponibilite + note_supports + note_ponctualite + note_engagement) / 6.0), 2) AS moyenne_generale,
        ROUND(AVG(note_clarte), 2) AS moy_clarte,
        ROUND(AVG(note_maitrise), 2) AS moy_maitrise,
        ROUND(AVG(note_disponibilite), 2) AS moy_disponibilite,
        ROUND(AVG(note_supports), 2) AS moy_supports,
        ROUND(AVG(note_ponctualite), 2) AS moy_ponctualite,
        ROUND(AVG(note_engagement), 2) AS moy_engagement
      FROM evaluations
      WHERE professeur_id = $1 AND semestre = $2 AND annee_academique = $3
    `, [profId, semestreFilter, anneeFilter]);

    const etudiants = await getOne(`
      SELECT COUNT(*) AS total FROM enrollments
      WHERE professeur_id = $1 AND semestre = $2 AND annee_academique = $3
    `, [profId, semestreFilter, anneeFilter]);

    const commentaires = await getAll(`
      SELECT commentaire, created_at FROM evaluations
      WHERE professeur_id = $1 AND commentaire IS NOT NULL
      AND semestre = $2 AND annee_academique = $3
      ORDER BY created_at DESC
    `, [profId, semestreFilter, anneeFilter]);

    res.json({
      ...stats,
      total_etudiants: etudiants.total,
      commentaires
    });
  } catch (err) {
    console.error('Erreur dashboard prof:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;