const express = require('express');
const router = express.Router();
const { getAll, getOne } = require('../config/database');

router.get('/professeurs', async (req, res) => {
  try {
    const professeurs = await getAll(`
      SELECT p.id, u.nom, u.prenom, p.matiere, p.departement
      FROM professeurs p
      JOIN users u ON p.user_id = u.id
      WHERE u.actif = 1 AND u.role = 'professeur'
      ORDER BY u.nom, u.prenom
    `);
    res.json({ professeurs });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/config', async (req, res) => {
  res.json({
    semestre_actuel: 'S2',
    annee_academique: '2025-2026',
    filieres: [
      'Tronc Commun',
      'Comptabilité de Gestion',
      'Management',
      'Commerce International',
      'Informatique de Gestion',
      'Transport & Logistique'
    ],
    niveaux: ['Licence 1', 'Licence 2', 'Licence 3']
  });
});

router.get('/statut-evaluations', async (req, res) => {
  try {
    const config = await getOne(
      `SELECT actif FROM codes_inscription WHERE code = 'EVAL_STATUS'`
    );
    res.json({ ouvert: config ? config.actif : 1 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;