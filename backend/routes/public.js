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
  try {
    // Récupérer les années académiques actives
    let anneesActives = [];
    let anneeActuelle = '2025-2026';
    let semestreActuel = 'S1';

    try {
      anneesActives = await getAll(`
        SELECT annee, semestre_actif FROM annees_academiques 
        WHERE actif = 1 ORDER BY annee DESC
      `);

      if (anneesActives.length > 0) {
        anneeActuelle = anneesActives[0].annee;
        semestreActuel = anneesActives[0].semestre_actif;
      }
    } catch (e) {
      // Si la table n'existe pas encore, utiliser les valeurs par défaut
      console.log('Table annees_academiques pas encore créée, valeurs par défaut utilisées');
    }

    res.json({
      semestre_actuel: semestreActuel,
      annee_academique: anneeActuelle,
      annees_academiques: anneesActives.map(a => a.annee),
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
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
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