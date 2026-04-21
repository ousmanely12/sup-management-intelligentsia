const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../config/database');

router.use(verifyToken);
router.use(requireRole('admin'));

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const total_profs = await getOne(`SELECT COUNT(*) AS n FROM professeurs`);
    const total_etudiants = await getOne(`SELECT COUNT(*) AS n FROM etudiants`);
    const total_evals = await getOne(`SELECT COUNT(*) AS n FROM evaluations`);
    const moy = await getOne(`
      SELECT ROUND(AVG((note_clarte+note_maitrise+note_disponibilite+note_supports+note_ponctualite)/5.0),2) AS moy
      FROM evaluations`);

    const classement = await getAll(`
      SELECT
        u.nom, u.prenom, p.matiere,
        COUNT(e.id) AS total_evaluations,
        ROUND(AVG((e.note_clarte+e.note_maitrise+e.note_disponibilite+e.note_supports+e.note_ponctualite)/5.0),2) AS moyenne_generale,
        ROUND(AVG(e.note_clarte),2) AS moy_clarte,
        ROUND(AVG(e.note_maitrise),2) AS moy_maitrise,
        ROUND(AVG(e.note_disponibilite),2) AS moy_disponibilite,
        ROUND(AVG(e.note_supports),2) AS moy_supports,
        ROUND(AVG(e.note_ponctualite),2) AS moy_ponctualite
      FROM professeurs p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN evaluations e ON e.professeur_id = p.id
      GROUP BY p.id
      ORDER BY moyenne_generale DESC
    `);

    res.json({
      total_profs: total_profs.n,
      total_etudiants: total_etudiants.n,
      total_evals: total_evals.n,
      moyenne_generale: moy.moy,
      classement,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/inscrire
router.delete('/inscrire', async (req, res) => {
  try {
    const { etudiant_id, professeur_id, semestre, annee_academique } = req.body;
    await runQuery(
      `DELETE FROM enrollments WHERE etudiant_id = ? AND professeur_id = ? AND semestre = ? AND annee_academique = ?`,
      [etudiant_id, professeur_id, semestre, annee_academique]
    );
    res.json({ message: 'Inscription supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});
// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await getAll(
      `SELECT id, nom, prenom, email, role, actif FROM users ORDER BY role, nom`
    );
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/users/:id/toggle
router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await getOne(`SELECT actif FROM users WHERE id = ?`, [
      req.params.id,
    ]);
    if (!user)
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    await runQuery(`UPDATE users SET actif = ? WHERE id = ?`, [
      user.actif ? 0 : 1,
      req.params.id,
    ]);
    res.json({ message: 'Statut mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/etudiants
router.get('/etudiants', async (req, res) => {
  try {
    const etudiants = await getAll(`
      SELECT e.id, u.nom, u.prenom, e.filiere, e.niveau
      FROM etudiants e JOIN users u ON e.user_id = u.id
      WHERE u.actif = 1 ORDER BY u.nom`);
    res.json({ etudiants });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/professeurs
router.get('/professeurs', async (req, res) => {
  try {
    const professeurs = await getAll(`
      SELECT p.id, u.nom, u.prenom, p.matiere
      FROM professeurs p JOIN users u ON p.user_id = u.id
      WHERE u.actif = 1 ORDER BY u.nom`);
    res.json({ professeurs });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/codes
router.get('/codes', async (req, res) => {
  try {
    const codes = await getAll(
      `SELECT * FROM codes_inscription ORDER BY created_at DESC`
    );
    res.json({ codes });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/admin/codes
router.post('/codes', async (req, res) => {
  try {
    const { code, description, max_usage } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis.' });
    await runQuery(
      `INSERT INTO codes_inscription (code, description, max_usage) VALUES (?, ?, ?)`,
      [code.trim().toUpperCase(), description || '', max_usage || 999]
    );
    res.json({ message: 'Code créé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/codes/:id/toggle
router.put('/codes/:id/toggle', async (req, res) => {
  try {
    const c = await getOne(`SELECT actif FROM codes_inscription WHERE id = ?`, [
      req.params.id,
    ]);
    if (!c) return res.status(404).json({ error: 'Code introuvable.' });
    await runQuery(`UPDATE codes_inscription SET actif = ? WHERE id = ?`, [
      c.actif ? 0 : 1,
      req.params.id,
    ]);
    res.json({ message: 'Statut mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/inscriptions
router.get('/inscriptions', async (req, res) => {
  try {
    const inscriptions = await getAll(`
        SELECT
          e.id AS enrollment_id,
          u_etu.nom AS etu_nom, u_etu.prenom AS etu_prenom,
          et.filiere, et.niveau,
          u_prof.nom AS prof_nom, u_prof.prenom AS prof_prenom,
          p.matiere,
          e.semestre, e.annee_academique
        FROM enrollments e
        JOIN etudiants et ON e.etudiant_id = et.id
        JOIN users u_etu ON et.user_id = u_etu.id
        JOIN professeurs p ON e.professeur_id = p.id
        JOIN users u_prof ON p.user_id = u_prof.id
        ORDER BY u_etu.nom, u_prof.nom
      `);
    res.json({ inscriptions });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/inscriptions/:id
router.delete('/inscriptions/:id', async (req, res) => {
  try {
    const inscription = await getOne(
      `SELECT id FROM enrollments WHERE id = ?`,
      [req.params.id]
    );
    if (!inscription)
      return res.status(404).json({ error: 'Inscription introuvable.' });

    await runQuery(`DELETE FROM enrollments WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Inscription supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// GET /api/admin/parametres
router.get('/parametres', async (req, res) => {
  try {
    const params = await getAll(`SELECT * FROM parametres`);
    res.json({ parametres: params });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/parametres/:cle
router.put('/parametres/:cle', async (req, res) => {
  try {
    const { valeur } = req.body;
    await runQuery(
      `UPDATE parametres SET valeur = ?, updated_at = CURRENT_TIMESTAMP WHERE cle = ?`,
      [valeur, req.params.cle]
    );
    res.json({ message: 'Paramètre mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/admin/inscrire
router.post('/inscrire', async (req, res) => {
  try {
    const { etudiant_id, professeur_id, semestre, annee_academique } = req.body;
    const existant = await getOne(
      `
      SELECT id FROM enrollments
      WHERE etudiant_id = ? AND professeur_id = ? AND semestre = ? AND annee_academique = ?`,
      [etudiant_id, professeur_id, semestre, annee_academique]
    );
    if (existant)
      return res.status(409).json({ error: 'Inscription déjà existante.' });
    await runQuery(
      `
      INSERT INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
      VALUES (?, ?, ?, ?)`,
      [etudiant_id, professeur_id, semestre, annee_academique]
    );
    res.json({ message: 'Étudiant inscrit avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/users/:id — modifier email et nom
router.put('/users/:id', async (req, res) => {
  try {
    const { nom, prenom, email } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email requis.' });
    }

    if (email.length > 100) {
      return res.status(400).json({ error: 'Email trop long.' });
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    const existing = await getOne(
      `SELECT id FROM users WHERE email = ? AND id != ?`,
      [email.toLowerCase().trim(), req.params.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    await runQuery(
      `UPDATE users SET nom = ?, prenom = ?, email = ? WHERE id = ?`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), req.params.id]
    );

    res.json({ message: 'Utilisateur mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
