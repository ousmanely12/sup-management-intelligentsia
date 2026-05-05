// API déjà déclarée dans auth.js
const user = requireAuth('professeur');

function escHtml(text) {
  if (text == null) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

if (user) {
  document.getElementById('nav-user').textContent =
    user.prenom + ' ' + user.nom;
  document.getElementById('welcome-title').textContent =
    'Bonjour, ' + user.prenom + ' !';
  chargerDashboardProf();
}

async function chargerDashboardProf(semestre = 'S2', annee_academique = '2025-2026') {
  const token = getToken();

  // Afficher le loading
  const loadingEl = document.getElementById('filter-loading');
  if (loadingEl) loadingEl.style.opacity = '1';

  try {
    const res = await fetch(`${API}/professeur/dashboard?semestre=${semestre}&annee_academique=${annee_academique}`, {
      headers: { Authorization: 'Bearer ' + token },
    });

    const data = await res.json();
    console.log('Dashboard data:', data);

    if (!res.ok) throw new Error(data.error);

    // Mettre à jour le badge semestre
    document.getElementById('badge-semestre').textContent = `${semestre} — ${annee_academique}`;

    // Stats
    document.getElementById('stat-total').textContent =
      data.total_evaluations || 0;
    document.getElementById('stat-moyenne').textContent = data.moyenne_generale
      ? parseFloat(data.moyenne_generale).toFixed(1) + '/5'
      : '--';
    document.getElementById('stat-etudiants').textContent =
      data.total_etudiants || 0;

    // Graphique critères
    const criteres = [
      { key: 'moy_clarte', label: 'Clarté des explications' },
      { key: 'moy_maitrise', label: 'Maîtrise du sujet' },
      { key: 'moy_disponibilite', label: 'Disponibilité et écoute' },
      { key: 'moy_supports', label: 'Qualité des supports' },
      { key: 'moy_ponctualite', label: 'Ponctualité' },
      { key: 'moy_engagement', label: 'Engagement pédagogique 🔥' },
    ];

    const chart = document.getElementById('bar-chart');

    if (!data.total_evaluations || data.total_evaluations === 0) {
      chart.innerHTML =
        '<div class="dash-empty">Aucune évaluation reçue pour le moment.</div>';
    } else {
      chart.innerHTML = criteres
        .map((c) => {
          const val = parseFloat(data[c.key] || 0).toFixed(1);
          const pct = Math.round((val / 5) * 100);
          const couleur = parseFloat(val) >= 4 ? '' : 'orange';
          return `
          <div class="bar-row">
            <div class="bar-label">${c.label}</div>
            <div class="bar-track">
              <div class="bar-fill ${couleur}" style="width:${pct}%"></div>
            </div>
            <div class="bar-val">${val}/5</div>
          </div>`;
        })
        .join('');
    }

    // Commentaires
    const commentsList = document.getElementById('comments-list');
    const comments = data.commentaires || [];
    document.getElementById('badge-nb-comments').textContent =
      comments.length + ' commentaire' + (comments.length > 1 ? 's' : '');

    if (comments.length === 0) {
      commentsList.innerHTML =
        '<div class="dash-empty">Aucun commentaire pour le moment.</div>';
    } else {
      commentsList.innerHTML = comments
        .map(
          (c) => `
        <div class="dash-comment">
          <div>« ${escHtml(c.commentaire)} »</div>
          <div class="dash-comment-meta">${c.created_at || ''}</div>
        </div>`
        )
        .join('');
    }
  } catch (err) {
    console.error('Erreur dashboard prof:', err);
    document.getElementById('bar-chart').innerHTML =
      '<div class="dash-empty" style="color:var(--rouge)">Erreur de chargement : ' +
      err.message +
      '</div>';
  } finally {
    // Cacher le loading
    const loadingEl = document.getElementById('filter-loading');
    if (loadingEl) loadingEl.style.opacity = '0';
  }
}

// Fonction appelée quand on change les filtres
function chargerDashboardProfFiltre() {
  const semestre = document.getElementById('filter-semestre').value;
  const annee = document.getElementById('filter-annee').value;
  chargerDashboardProf(semestre, annee);
}
