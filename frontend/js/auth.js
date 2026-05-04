const API = 'http://localhost:3000/api';

// Afficher une alerte
function showAlert(type, message) {
  document
    .querySelectorAll('.alert')
    .forEach((a) => a.classList.remove('show'));
  const el = document.getElementById('alert-' + type);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}

// Sauvegarder la session
function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Récupérer l'utilisateur connecté
function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

// Récupérer le token
function getToken() {
  return localStorage.getItem('token');
}

// Déconnexion
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/pages/login.html';
}

// Rediriger si déjà connecté
function redirectIfLoggedIn() {
  const token = getToken();
  const user = getUser();
  if (token && user) redirectByRole(user.role);
}

// Rediriger selon le rôle
function redirectByRole(role) {
  const routes = {
    etudiant: '/pages/etudiant.html',
    professeur: '/pages/professeur.html',
    admin: '/pages/admin.html',
  };
  window.location.href = routes[role] || '/pages/login.html';
}

// Protéger une page (à appeler en haut de chaque page dashboard)
function requireAuth(expectedRole) {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = '/pages/login.html';
    return null;
  }
  if (expectedRole && user.role !== expectedRole) {
    window.location.href = '/pages/login.html';
    return null;
  }
  return user;
}

// ── Formulaire de login ──────────────────────────────
const loginForm = document.getElementById('login-form');
if (loginForm) {
  redirectIfLoggedIn();

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login');
    btn.textContent = 'Connexion...';
    btn.disabled = true;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showAlert('error', data.error || 'Erreur de connexion.');
        btn.textContent = 'Se connecter';
        btn.disabled = false;
        return;
      }

      saveSession(data.token, data.user);
      showAlert('success', 'Connexion réussie ! Redirection...');
      setTimeout(() => redirectByRole(data.user.role), 800);
    } catch (err) {
      showAlert('error', 'Impossible de contacter le serveur.');
      btn.textContent = 'Se connecter';
      btn.disabled = false;
    }
  });
}
