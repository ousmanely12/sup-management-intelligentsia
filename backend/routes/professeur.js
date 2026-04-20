const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getOne, getAll } = require('../config/database');

router.use(verifyToken);
router.use(requireRole('professeur'));

// GET /api/professeur/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const profId = req.user.profileId;

    const stats = await getOne(`
      SELECT
        COUNT(*) AS total_evaluations,
        ROUND(AVG((note_clarte + note_maitrise + note_disponibilite + note_supports + note_ponctualite) / 5.0), 2) AS moyenne_generale,
        ROUND(AVG(note_clarte), 2) AS moy_clarte,
        ROUND(AVG(note_maitrise), 2) AS moy_maitrise,
        ROUND(AVG(note_disponibilite), 2) AS moy_disponibilite,
        ROUND(AVG(note_supports), 2) AS moy_supports,
        ROUND(AVG(note_ponctualite), 2) AS moy_ponctualite
      FROM evaluations
      WHERE professeur_id = ? AND semestre = 'S1' AND annee_academique = '2024-2025'
    `, [profId]);

    const etudiants = await getOne(`
      SELECT COUNT(*) AS total FROM enrollments
      WHERE professeur_id = ? AND semestre = 'S1' AND annee_academique = '2024-2025'
    `, [profId]);

    const commentaires = await getAll(`
      SELECT commentaire, created_at FROM evaluations
      WHERE professeur_id = ? AND commentaire IS NOT NULL
      AND semestre = 'S1' AND annee_academique = '2024-2025'
      ORDER BY created_at DESC
    `, [profId]);

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