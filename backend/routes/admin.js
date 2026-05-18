const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { getOne, getAll, runQuery } = require('../config/database');

router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/stats', async (req, res) => {
  try {
    const { semestre, annee_academique } = req.query;
    const semestreFilter = semestre || 'S2';
    const anneeFilter = annee_academique || '2025-2026';
    
    const total_profs = await getOne(`SELECT COUNT(*) AS n FROM professeurs`);
    const total_etudiants = await getOne(`SELECT COUNT(*) AS n FROM etudiants`);
    const total_evals = await getOne(`
      SELECT COUNT(*) AS n FROM evaluations 
      WHERE semestre = $1 AND annee_academique = $2
    `, [semestreFilter, anneeFilter]);
    
    const moy = await getOne(`
      SELECT ROUND(AVG((note_clarte+note_maitrise+note_disponibilite+note_supports+note_ponctualite+note_engagement)/6.0),2) AS moy
      FROM evaluations
      WHERE semestre = $1 AND annee_academique = $2
    `, [semestreFilter, anneeFilter]);

    const classement = await getAll(`
      SELECT
        u.nom, u.prenom, p.matiere,
        COUNT(e.id) AS total_evaluations,
        ROUND(AVG((e.note_clarte+e.note_maitrise+e.note_disponibilite+e.note_supports+e.note_ponctualite+e.note_engagement)/6.0),2) AS moyenne_generale,
        ROUND(AVG(e.note_clarte),2) AS moy_clarte,
        ROUND(AVG(e.note_maitrise),2) AS moy_maitrise,
        ROUND(AVG(e.note_disponibilite),2) AS moy_disponibilite,
        ROUND(AVG(e.note_supports),2) AS moy_supports,
        ROUND(AVG(e.note_ponctualite),2) AS moy_ponctualite,
        ROUND(AVG(e.note_engagement),2) AS moy_engagement
      FROM professeurs p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN evaluations e ON e.professeur_id = p.id 
        AND e.semestre = $1 AND e.annee_academique = $2
      GROUP BY p.id, u.nom, u.prenom, p.matiere
      ORDER BY moyenne_generale DESC NULLS LAST
    `, [semestreFilter, anneeFilter]);

    res.json({
      total_profs: total_profs.n,
      total_etudiants: total_etudiants.n,
      total_evals: total_evals.n,
      moyenne_generale: moy.moy,
      classement
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await getAll(`SELECT id, nom, prenom, email, role, actif FROM users ORDER BY role, nom`);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email requis.' });
    }
    const existing = await getOne(
      `SELECT id FROM users WHERE email = $1 AND id != $2`,
      [email.toLowerCase().trim(), req.params.id]
    );
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    await runQuery(
      `UPDATE users SET nom = $1, prenom = $2, email = $3 WHERE id = $4`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), req.params.id]
    );
    res.json({ message: 'Utilisateur mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/users/:id/toggle', async (req, res) => {
  try {
    const user = await getOne(`SELECT actif FROM users WHERE id = $1`, [req.params.id]);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    await runQuery(`UPDATE users SET actif = $1 WHERE id = $2`, [user.actif ? 0 : 1, req.params.id]);
    res.json({ message: 'Statut mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }
    const target = await getOne(`SELECT id, role FROM users WHERE id = $1`, [id]);
    if (!target) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    if (target.role === 'admin') {
      const row = await getOne(
        `SELECT CAST(COUNT(*) AS INTEGER) AS n FROM users WHERE role = 'admin'`
      );
      const n = row ? parseInt(row.n, 10) : 0;
      if (n <= 1) {
        return res.status(400).json({ error: 'Impossible de supprimer le dernier administrateur.' });
      }
    }

    // ON DELETE CASCADE s'occupera automatiquement des enregistrements liés
    if (target.role === 'professeur') {
      await runQuery(`DELETE FROM professeurs WHERE user_id = $1`, [id]);
    } else if (target.role === 'etudiant') {
      await runQuery(`DELETE FROM etudiants WHERE user_id = $1`, [id]);
    }

    // Supprimer l'utilisateur
    await runQuery(`DELETE FROM users WHERE id = $1`, [id]);
    res.json({ message: 'Utilisateur supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression.' });
  }
});

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

router.post('/inscrire', async (req, res) => {
  try {
    const { etudiant_id, professeur_id, semestre, annee_academique } = req.body;
    
    // Validation des IDs
    const etuId = parseInt(etudiant_id, 10);
    const profId = parseInt(professeur_id, 10);
    if (Number.isNaN(etuId) || Number.isNaN(profId)) {
      return res.status(400).json({ error: 'IDs invalides.' });
    }
    
    // Validation du semestre
    if (!semestre || !['S1', 'S2'].includes(semestre)) {
      return res.status(400).json({ error: 'Semestre invalide (S1 ou S2).' });
    }
    
    // Validation de l'année académique
    if (!annee_academique || !/^\d{4}-\d{4}$/.test(annee_academique)) {
      return res.status(400).json({ error: 'Année académique invalide (format: 2024-2025).' });
    }
    
    const existant = await getOne(`
      SELECT id FROM enrollments
      WHERE etudiant_id = $1 AND professeur_id = $2 AND semestre = $3 AND annee_academique = $4`,
      [etuId, profId, semestre, annee_academique]);
    if (existant) return res.status(409).json({ error: 'Inscription déjà existante.' });
    await runQuery(`
      INSERT INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
      VALUES ($1, $2, $3, $4)`, [etuId, profId, semestre, annee_academique]);
    res.json({ message: 'Étudiant inscrit avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

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

router.delete('/inscriptions/:id', async (req, res) => {
  try {
    const inscription = await getOne(
      `SELECT id FROM enrollments WHERE id = $1`, [req.params.id]
    );
    if (!inscription) return res.status(404).json({ error: 'Inscription introuvable.' });
    await runQuery(`DELETE FROM enrollments WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Inscription supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/codes', async (req, res) => {
  try {
    const codes = await getAll(`SELECT * FROM codes_inscription ORDER BY created_at DESC`);
    res.json({ codes });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/codes', async (req, res) => {
  try {
    const { code, description, max_usage } = req.body;
    if (!code) return res.status(400).json({ error: 'Code requis.' });
    await runQuery(
      `INSERT INTO codes_inscription (code, description, max_usage) VALUES ($1, $2, $3)`,
      [code.trim().toUpperCase(), description || '', max_usage || 999]
    );
    res.json({ message: 'Code créé.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.put('/codes/:id/toggle', async (req, res) => {
  try {
    const c = await getOne(`SELECT actif FROM codes_inscription WHERE id = $1`, [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Code introuvable.' });
    await runQuery(`UPDATE codes_inscription SET actif = $1 WHERE id = $2`, [c.actif ? 0 : 1, req.params.id]);
    res.json({ message: 'Statut mis à jour.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/commentaires', async (req, res) => {
  try {
    const { semestre, annee_academique } = req.query;
    const semestreFilter = semestre || 'S2';
    const anneeFilter = annee_academique || '2025-2026';
    
    const commentaires = await getAll(`
      SELECT 
        e.commentaire,
        e.created_at,
        e.note_clarte, e.note_maitrise, e.note_disponibilite, e.note_supports, e.note_ponctualite, e.note_engagement,
        u.nom AS prof_nom, u.prenom AS prof_prenom,
        p.matiere
      FROM evaluations e
      JOIN professeurs p ON e.professeur_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE e.commentaire IS NOT NULL 
        AND e.commentaire != ''
        AND e.semestre = $1 
        AND e.annee_academique = $2
      ORDER BY e.created_at DESC
      LIMIT 100
    `, [semestreFilter, anneeFilter]);
    
    res.json({ commentaires });
  } catch (err) {
    console.error('Erreur GET commentaires:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.delete('/codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Identifiant invalide.' });
    }
    const row = await getOne(`SELECT id, code FROM codes_inscription WHERE id = $1`, [id]);
    if (!row) {
      return res.status(404).json({ error: 'Code introuvable.' });
    }
    if (row.code === 'EVAL_STATUS') {
      return res.status(400).json({ error: 'Ce code système ne peut pas être supprimé.' });
    }
    await runQuery(`DELETE FROM codes_inscription WHERE id = $1`, [id]);
    res.json({ message: 'Code supprimé.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});



// GET /api/admin/evaluation-status
router.get('/evaluation-status', async (req, res) => {
  try {
    const config = await getOne(
      `SELECT * FROM codes_inscription WHERE code = 'EVAL_STATUS' LIMIT 1`
    );
    res.json({ ouvert: config ? config.actif : 1 });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/evaluation-status
router.put('/evaluation-status', async (req, res) => {
  try {
    const { ouvert } = req.body;
    const existing = await getOne(
      `SELECT id FROM codes_inscription WHERE code = 'EVAL_STATUS'`
    );
    if (existing) {
      await runQuery(
        `UPDATE codes_inscription SET actif = $1 WHERE code = 'EVAL_STATUS'`,
        [ouvert ? 1 : 0]
      );
    } else {
      await runQuery(
        `INSERT INTO codes_inscription (code, description, actif, max_usage)
         VALUES ('EVAL_STATUS', 'Statut des évaluations', $1, 99999)`,
        [ouvert ? 1 : 0]
      );
    }
    res.json({ message: ouvert ? 'Évaluations ouvertes.' : 'Évaluations fermées.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// ── Routes pour la gestion des années académiques ────────────────────────────────

// GET /api/admin/annees-academiques - Lister toutes les années académiques
router.get('/annees-academiques', async (req, res) => {
  try {
    // S'assurer que la table existe
    try {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS annees_academiques (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          annee TEXT UNIQUE NOT NULL,
          actif INTEGER DEFAULT 1,
          semestre_actif TEXT DEFAULT 'S1',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      // Ignorer si la table existe déjà
    }

    const annees = await getAll(`
      SELECT * FROM annees_academiques 
      ORDER BY annee DESC
    `);
    res.json(annees);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// POST /api/admin/annees-academiques - Ajouter une nouvelle année académique
router.post('/annees-academiques', async (req, res) => {
  try {
    const { annee, semestre_actif } = req.body;

    // Validation
    if (!annee || !/^\d{4}-\d{4}$/.test(annee)) {
      return res.status(400).json({ error: 'Année académique invalide (format: 2025-2026).' });
    }

    if (semestre_actif && !['S1', 'S2'].includes(semestre_actif)) {
      return res.status(400).json({ error: 'Semestre invalide (S1 ou S2).' });
    }

    // Vérifier si l'année existe déjà
    const existant = await getOne(
      `SELECT id FROM annees_academiques WHERE annee = $1`,
      [annee]
    );

    if (existant) {
      return res.status(409).json({ error: 'Cette année académique existe déjà.' });
    }

    // Insérer la nouvelle année
    await runQuery(
      `INSERT INTO annees_academiques (annee, semestre_actif) VALUES ($1, $2)`,
      [annee, semestre_actif || 'S1']
    );

    res.json({ message: 'Année académique ajoutée avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// PUT /api/admin/annees-academiques/:id - Modifier une année académique
router.put('/annees-academiques/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { actif, semestre_actif } = req.body;

    // Validation de l'ID
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide.' });
    }

    // Validation du semestre
    if (semestre_actif && !['S1', 'S2'].includes(semestre_actif)) {
      return res.status(400).json({ error: 'Semestre invalide (S1 ou S2).' });
    }

    // Construire la requête de mise à jour
    const updates = [];
    const values = [];

    if (actif !== undefined) {
      updates.push('actif = $' + (updates.length + 1));
      values.push(actif ? 1 : 0);
    }

    if (semestre_actif) {
      updates.push('semestre_actif = $' + (updates.length + 1));
      values.push(semestre_actif);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à effectuer.' });
    }

    values.push(id);

    await runQuery(
      `UPDATE annees_academiques SET ${updates.join(', ')} WHERE id = $${updates.length + 1}`,
      values
    );

    res.json({ message: 'Année académique mise à jour avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// DELETE /api/admin/annees-academiques/:id - Supprimer une année académique
router.delete('/annees-academiques/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // Validation de l'ID
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID invalide.' });
    }

    // Vérifier si des données sont liées à cette année
    const evaluations = await getOne(
      `SELECT COUNT(*) AS n FROM evaluations WHERE annee_academique = 
       (SELECT annee FROM annees_academiques WHERE id = $1)`,
      [id]
    );

    if (evaluations && evaluations.n > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer cette année : des évaluations y sont liées.' 
      });
    }

    await runQuery(`DELETE FROM annees_academiques WHERE id = $1`, [id]);

    res.json({ message: 'Année académique supprimée avec succès.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;