const user = requireAuth('professeur');

if (user) {
  document.getElementById('nav-user').textContent =
    user.prenom + ' ' + user.nom;
  document.getElementById('welcome-title').textContent =
    'Bonjour, ' + user.prenom + ' !';
  chargerDashboardProf();
}

async function chargerDashboardProf() {
  const token = getToken();
  try {
    const res = await fetch('https://sup-management-intelligentsia-dlw2.onrender.com/api/professeur/dashboard', {
      headers: { Authorization: 'Bearer ' + token },
    });

    const data = await res.json();
    console.log('Dashboard data:', data);

    if (!res.ok) throw new Error(data.error);

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
    ];

    const chart = document.getElementById('bar-chart');

    if (!data.total_evaluations || data.total_evaluations === 0) {
      chart.innerHTML =
        '<div style="color:var(--gris-text);font-size:14px;padding:1rem 0;">Aucune évaluation reçue pour le moment.</div>';
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
        '<div style="color:var(--gris-text);font-size:14px;">Aucun commentaire pour le moment.</div>';
    } else {
      commentsList.innerHTML = comments
        .map(
          (c) => `
        <div style="background:#F5F7FA; border-radius:8px; padding:12px 14px; font-size:14px; color:#424242; border-left:3px solid var(--bleu); margin-bottom:8px;">
          <div>"${c.commentaire}"</div>
          <div style="font-size:11px; color:var(--gris-text); margin-top:6px;">${c.created_at}</div>
        </div>`
        )
        .join('');
    }
  } catch (err) {
    console.error('Erreur dashboard prof:', err);
    document.getElementById('bar-chart').innerHTML =
      '<div style="color:red;font-size:14px;">Erreur de chargement : ' +
      err.message +
      '</div>';
  }
}
