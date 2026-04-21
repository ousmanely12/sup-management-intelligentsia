const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'sup_management_secret_key_2024';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Accès refusé. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('Erreur JWT:', err.message);
    return res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: 'Accès interdit. Rôle insuffisant.' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
