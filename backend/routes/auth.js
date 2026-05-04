const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getOne, runQuery } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'sup_management_secret_key_2024';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    if (email.length > 100 || password.length > 100) {
      return res.status(400).json({ error: 'Données invalides.' });
    }

    const user = await getOne(
      `SELECT * FROM users WHERE email = $1 AND actif = 1`,
      [email.toLowerCase().trim()]
    );

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    let profileId = null;
    let profileInfo = {};

    if (user.role === 'etudiant') {
      // S'assurer que les colonnes existent
      try {
        await runQuery(`ALTER TABLE etudiants ADD COLUMN IF NOT EXISTS semestre TEXT DEFAULT 'S1'`);
        await runQuery(`ALTER TABLE etudiants ADD COLUMN IF NOT EXISTS annee_academique TEXT DEFAULT '2024-2025'`);
      } catch (e) { /* ignorer */ }
      
      const etudiant = await getOne(
        `SELECT id, filiere, niveau, semestre, annee_academique FROM etudiants WHERE user_id = $1`,
        [user.id]
      );
      if (etudiant) {
        profileId = etudiant.id;
        profileInfo = {
          filiere: etudiant.filiere,
          niveau: etudiant.niveau,
          semestre: etudiant.semestre || 'S1',
          annee_academique: etudiant.annee_academique || '2024-2025'
        };
      }
    } else if (user.role === 'professeur') {
      const prof = await getOne(
        `SELECT id, matiere, departement FROM professeurs WHERE user_id = $1`,
        [user.id]
      );
      if (prof) {
        profileId = prof.id;
        profileInfo = {
          matiere: prof.matiere,
          departement: prof.departement
        };
      }
    }

    const tokenPayload = {
      userId: user.id,
      profileId,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    res.json({
      message: 'Connexion réussie.',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        ...profileInfo
      }
    });

  } catch (err) {
    console.error('Erreur login:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nom, prenom, email, password, role, matiere, departement, filiere, niveau } = req.body;

    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    if (!['etudiant', 'professeur', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum).' });
    }

    if (nom.length > 50 || prenom.length > 50) {
      return res.status(400).json({ error: 'Nom ou prénom trop long.' });
    }

    const existing = await getOne(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await runQuery(
      `INSERT INTO users (nom, prenom, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), password_hash, role]
    );

    const userId = result.lastID;

    if (role === 'professeur') {
      if (!matiere) return res.status(400).json({ error: 'Matière obligatoire.' });
      await runQuery(
        `INSERT INTO professeurs (user_id, matiere, departement) VALUES ($1, $2, $3)`,
        [userId, matiere, departement || null]
      );
    } else if (role === 'etudiant') {
      if ( !filiere || !niveau) {
        return res.status(400).json({ error: 'filière et niveau obligatoires.' });
      }
      await runQuery(
        `INSERT INTO etudiants (user_id, filiere, niveau) VALUES ($1, $2, $3)`,
        [userId, filiere, niveau]
      );
    }

    res.status(201).json({ message: 'Compte créé avec succès.' });

  } catch (err) {
    console.error('Erreur register:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/register-etudiant', async (req, res) => {
  try {
    const {
      nom, prenom, email, password,
      filiere, niveau,
      professeurs, semestre, annee_academique,
      code_inscription
    } = req.body;

    if (!code_inscription) {
      return res.status(400).json({ error: "Code d'inscription requis." });
    }

    const code = await getOne(
      `SELECT * FROM codes_inscription WHERE code = $1 AND actif = 1`,
      [code_inscription.trim().toUpperCase()]
    );

    if (!code) {
      return res.status(403).json({ error: "Code d'inscription invalide." });
    }

    if (code.usage_count >= code.max_usage) {
      return res.status(403).json({ error: "Ce code a atteint sa limite d'utilisation." });
    }

    if (!nom || !prenom || !email || !password || !filiere || !niveau) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe trop court.' });
    }

    if (!professeurs || professeurs.length === 0) {
      return res.status(400).json({ error: 'Sélectionnez au moins un professeur.' });
    }

    const existing = await getOne(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const userResult = await runQuery(
      `INSERT INTO users (nom, prenom, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'etudiant') RETURNING id`,
      [nom.trim(), prenom.trim(), email.toLowerCase().trim(), password_hash]
    );

    const userId = userResult.lastID;

    // Génération automatique du numéro étudiant
    const numero_etudiant = 'ETU-' + Date.now();

    const etuResult = await runQuery(
      `INSERT INTO etudiants (user_id, filiere, niveau, numero_etudiant, semestre, annee_academique)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [userId, filiere, niveau, numero_etudiant, semestre || 'S2', annee_academique || '2025-2026']
    );

    const etuId = etuResult.lastID;

    for (const profId of professeurs) {
      await runQuery(
        `INSERT INTO enrollments (etudiant_id, professeur_id, semestre, annee_academique)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [etuId, profId, semestre || 'S2', annee_academique || '2025-2026']
      );
    }

    await runQuery(
      `UPDATE codes_inscription SET usage_count = usage_count + 1 WHERE id = $1`,
      [code.id]
    );

    res.status(201).json({ message: 'Compte créé avec succès.' });

  } catch (err) {
    console.error('Erreur register-etudiant:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});


router.put('/change-password', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const { ancien_password, nouveau_password } = req.body;

    if (!ancien_password || !nouveau_password) {
      return res.status(400).json({ error: 'Ancien et nouveau mot de passe requis.' });
    }

    if (nouveau_password.length < 6) {
      return res.status(400).json({ error: 'Nouveau mot de passe trop court.' });
    }

    const user = await getOne(`SELECT * FROM users WHERE id = $1`, [req.user.userId]);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const valid = await bcrypt.compare(ancien_password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Ancien mot de passe incorrect.' });

    const nouveau_hash = await bcrypt.hash(nouveau_password, 12);
    await runQuery(`UPDATE users SET password_hash = $1 WHERE id = $2`, [nouveau_hash, req.user.userId]);

    res.json({ message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('Erreur change-password:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/me', require('../middleware/auth').verifyToken, async (req, res) => {
  try {
    const user = await getOne(
      `SELECT id, nom, prenom, email, role, created_at FROM users WHERE id = $1 AND actif = 1`,
      [req.user.userId]
    );
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;