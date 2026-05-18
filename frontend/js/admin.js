// API déjà déclarée dans auth.js
const user = requireAuth('admin');

if (user) {
  document.getElementById('nav-user').textContent =
    user.prenom + ' ' + user.nom;
  chargerDashboard();
  chargerUtilisateurs();
  chargerSelectsInscription();
  chargerCodes();
  chargerInscriptions();
  chargerStatutEval();
  chargerCommentaires();
}

async function fetchAdmin(url, options = {}) {
  const res = await fetch(`${API}/admin` + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
      ...(options.headers || {}),
    },
  });
  return res;
}

function apiBase() {
  return API;
}

async function chargerDashboard() {
  try {
    const semestre = document.getElementById('filter-semestre')?.value || 'S2';
    const annee = document.getElementById('filter-annee')?.value || '2025-2026';
    
    // Afficher le loading
    const loadingEl = document.getElementById('filter-loading');
    if (loadingEl) loadingEl.style.opacity = '1';
    
    const res = await fetchAdmin(`/stats?semestre=${semestre}&annee_academique=${annee}`);
    const data = await res.json();
    
    // Mettre à jour le badge période
    const badgePeriode = document.getElementById('badge-periode');
    if (badgePeriode) badgePeriode.textContent = `${semestre} — ${annee}`;
    
    document.getElementById('stat-profs').textContent = data.total_profs || 0;
    document.getElementById('stat-etudiants').textContent =
      data.total_etudiants || 0;
    document.getElementById('stat-evals').textContent = data.total_evals || 0;
    document.getElementById('stat-moy').textContent = data.moyenne_generale
      ? parseFloat(data.moyenne_generale).toFixed(1) + '/5'
      : '--';

    const tbody = document.getElementById('tbody-profs');
    if (!data.classement || data.classement.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="10" style="text-align:center;color:var(--gris-text);">Aucune évaluation encore.</td></tr>';
      return;
    }

    tbody.innerHTML = data.classement
      .map((p, i) => {
        const moy = parseFloat(p.moyenne_generale || 0).toFixed(1);
        const couleurMoy =
          moy >= 4
            ? 'color:var(--vert);font-weight:600;'
            : moy >= 3
              ? 'color:var(--orange);font-weight:600;'
              : 'color:var(--rouge);font-weight:600;';
        return `<tr>
        <td>${i + 1}</td>
        <td>${p.prenom} ${p.nom}</td>
        <td>${p.matiere}</td>
        <td style="text-align:center;">${p.total_evaluations}</td>
        <td style="text-align:center;">${parseFloat(p.moy_clarte || 0).toFixed(1)}</td>
        <td style="text-align:center;">${parseFloat(p.moy_maitrise || 0).toFixed(1)}</td>
        <td style="text-align:center;">${parseFloat(p.moy_disponibilite || 0).toFixed(1)}</td>
        <td style="text-align:center;">${parseFloat(p.moy_supports || 0).toFixed(1)}</td>
        <td style="text-align:center;">${parseFloat(p.moy_ponctualite || 0).toFixed(1)}</td>
        <td style="text-align:center;">${parseFloat(p.moy_engagement || 0).toFixed(1)}</td>
        <td style="${couleurMoy}">${moy}/5</td>
      </tr>`;
      })
      .join('');
    
    // Charger aussi les commentaires pour la même période
    await chargerCommentaires();
    
  } catch (err) {
    console.error('Erreur stats:', err);
  } finally {
    // Cacher le loading
    const loadingEl = document.getElementById('filter-loading');
    if (loadingEl) loadingEl.style.opacity = '0';
  }
}

async function chargerUtilisateurs() {
  try {
    const res = await fetchAdmin('/users');
    const data = await res.json();
    const tbody = document.getElementById('tbody-users');

    tbody.innerHTML = data.users
      .map(
        (u) => `
      <tr>
        <td>${u.prenom} ${u.nom}</td>
        <td style="font-size:13px;">${u.email}</td>
        <td>
          <span class="badge ${u.role === 'admin' ? 'badge-bleu' : u.role === 'professeur' ? 'badge-orange' : 'badge-gris'}">
            ${u.role}
          </span>
        </td>
        <td>
          <span class="badge ${u.actif ? 'badge-vert' : 'badge-gris'}">
            ${u.actif ? 'Actif' : 'Inactif'}
          </span>
        </td>
        <td class="td-actions">
          <button type="button" class="btn-action"
            onclick='ouvrirModalEdit(${u.id}, ${JSON.stringify(u.nom)}, ${JSON.stringify(u.prenom)}, ${JSON.stringify(u.email)})'>
            Modifier
          </button>
          <button type="button" class="btn-action"
            onclick="toggleUser(${u.id}, ${u.actif})">
            ${u.actif ? 'Désactiver' : 'Activer'}
          </button>
          <button type="button" class="btn-action btn-action--danger"
            onclick="supprimerUser(${u.id})">
            Supprimer
          </button>
        </td>
      </tr>`
      )
      .join('');
  } catch (err) {
    console.error('Erreur users:', err);
  }
}

async function chargerSelectsInscription() {
  try {
    const [resE, resP] = await Promise.all([
      fetchAdmin('/etudiants'),
      fetchAdmin('/professeurs'),
    ]);
    const dataE = await resE.json();
    const dataP = await resP.json();

    document.getElementById('sel-etudiant').innerHTML = dataE.etudiants
      .map(
        (e) =>
          `<option value="${e.id}">${e.prenom} ${e.nom} (${e.filiere})</option>`
      )
      .join('');

    document.getElementById('sel-prof').innerHTML = dataP.professeurs
      .map(
        (p) =>
          `<option value="${p.id}">${p.prenom} ${p.nom} — ${p.matiere}</option>`
      )
      .join('');
  } catch (err) {
    console.error('Erreur selects:', err);
  }
}

async function toggleUser(userId, actifActuel) {
  try {
    await fetchAdmin('/users/' + userId + '/toggle', { method: 'PUT' });
    chargerUtilisateurs();
  } catch (err) {
    console.error('Erreur toggle:', err);
  }
}

async function supprimerUser(userId) {
  if (
    !confirm(
      'Supprimer définitivement cet utilisateur ?\n\nLes données liées (profil, inscriptions, éventuellement évaluations) seront supprimées selon les règles de la base.'
    )
  ) {
    return;
  }
  try {
    const res = await fetchAdmin('/users/' + userId, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Suppression impossible.');
      return;
    }
    chargerUtilisateurs();
    chargerSelectsInscription();
    chargerDashboard();
  } catch (err) {
    console.error(err);
    alert('Erreur serveur.');
  }
}

async function inscrireEtudiant() {
  const etuId = document.getElementById('sel-etudiant').value;
  const profId = document.getElementById('sel-prof').value;
  const msg = document.getElementById('enroll-msg');

  try {
    const res = await fetchAdmin('/inscrire', {
      method: 'POST',
      body: JSON.stringify({
        etudiant_id: etuId,
        professeur_id: profId,
        semestre: 'S1',
        annee_academique: '2024-2025',
      }),
    });
    const data = await res.json();
    msg.style.color = res.ok ? 'var(--vert)' : 'var(--rouge)';
    msg.textContent = data.message || data.error;
    if (res.ok) chargerSelectsInscription();
  } catch (err) {
    msg.style.color = 'var(--rouge)';
    msg.textContent = 'Erreur serveur.';
  }
}

function toggleChampsRole() {
  const role = document.getElementById('new-role').value;
  document.getElementById('champs-prof').style.display =
    role === 'professeur' ? 'block' : 'none';
  document.getElementById('champs-etudiant').style.display =
    role === 'etudiant' ? 'block' : 'none';
}

function ouvrirModalUser() {
  document
    .querySelectorAll('.alert')
    .forEach((a) => a.classList.remove('show'));
  document.getElementById('modal-user').classList.add('open');
}

function fermerModalUser() {
  document.getElementById('modal-user').classList.remove('open');
}

async function creerUtilisateur() {
  const role = document.getElementById('new-role').value;
  const body = {
    nom: document.getElementById('new-nom').value.trim(),
    prenom: document.getElementById('new-prenom').value.trim(),
    email: document.getElementById('new-email').value.trim(),
    password: document.getElementById('new-password').value,
    role,
    matiere: document.getElementById('new-matiere').value.trim(),
    departement: document.getElementById('new-departement').value.trim(),
    numero_etudiant: document.getElementById('new-numero').value.trim(),
    filiere: document.getElementById('new-filiere').value.trim(),
    niveau: document.getElementById('new-niveau').value.trim(),
  };

  try {
    const base =
      typeof API !== 'undefined'
        ? API
        : `${window.location.origin.replace(/\/$/, '')}/api`;
    const res = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      const el = document.getElementById('modal-user-error');
      el.textContent = data.error;
      el.classList.add('show');
      return;
    }

    const el = document.getElementById('modal-user-success');
    el.textContent = 'Utilisateur créé avec succès !';
    el.classList.add('show');
    setTimeout(() => {
      fermerModalUser();
      chargerUtilisateurs();
      chargerSelectsInscription();
    }, 1000);
  } catch (err) {
    console.error('Erreur création:', err);
  }
}
async function chargerCodes() {
  try {
    const res = await fetchAdmin('/codes');
    const data = await res.json();
    const tbody = document.getElementById('tbody-codes');

    if (!data.codes || data.codes.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--gris-text);">Aucun code.</td></tr>';
      return;
    }

    tbody.innerHTML = data.codes
      .map(
        (c) => `
        <tr>
          <td><strong style="font-family:monospace;font-size:15px;color:var(--bleu-dark);">${c.code}</strong></td>
          <td style="font-size:13px;">${c.description || '--'}</td>
          <td style="text-align:center;">
            <span class="badge badge-bleu">${c.usage_count} / ${c.max_usage}</span>
          </td>
          <td>
            <span class="badge ${c.actif ? 'badge-vert' : 'badge-gris'}">
              ${c.actif ? 'Actif' : 'Inactif'}
            </span>
          </td>
          <td class="td-actions">
            <button type="button" class="btn-action"
              onclick="toggleCode(${c.id}, ${c.actif})">
              ${c.actif ? 'Désactiver' : 'Activer'}
            </button>
            <button type="button" class="btn-action btn-action--danger"
              onclick='supprimerCode(${c.id}, ${JSON.stringify(c.code)})'>
              Supprimer
            </button>
          </td>
        </tr>`
      )
      .join('');
  } catch (err) {
    console.error('Erreur codes:', err);
  }
}

async function toggleCode(codeId, actifActuel) {
  await fetchAdmin('/codes/' + codeId + '/toggle', { method: 'PUT' });
  chargerCodes();
}

async function supprimerCode(codeId, codeLabel) {
  if (
    !confirm(
      `Supprimer définitivement le code « ${codeLabel} » ?\n\nCette action est irréversible.`
    )
  ) {
    return;
  }
  try {
    const res = await fetchAdmin('/codes/' + codeId, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || 'Suppression impossible.');
      return;
    }
    chargerCodes();
  } catch (err) {
    console.error(err);
    alert('Erreur serveur.');
  }
}

async function genererCode() {
  const code =
    'SMI-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const description = prompt('Description du code (ex: Promotion 2025-2026) :');
  if (description === null) return;

  await fetchAdmin('/codes', {
    method: 'POST',
    body: JSON.stringify({ code, description, max_usage: 999 }),
  });
  chargerCodes();
}

async function chargerInscriptions() {
  try {
    const res = await fetchAdmin('/inscriptions');
    const data = await res.json();
    const tbody = document.getElementById('tbody-inscriptions');

    if (!data.inscriptions || data.inscriptions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:var(--gris-text);">Aucune inscription.</td></tr>';
      return;
    }

    // Regrouper par étudiant
    const grouped = {};
    data.inscriptions.forEach((i) => {
      const key = i.etu_prenom + ' ' + i.etu_nom;
      if (!grouped[key]) {
        grouped[key] = {
          nom: i.etu_prenom + ' ' + i.etu_nom,
          filiere: i.filiere,
          niveau: i.niveau,
          profs: [],
        };
      }
      grouped[key].profs.push({
        id: i.enrollment_id,
        nom: i.prof_prenom + ' ' + i.prof_nom,
        matiere: i.matiere,
        semestre: i.semestre + ' ' + i.annee_academique,
      });
    });

    tbody.innerHTML = Object.values(grouped)
      .map(
        (e) => `
        <tr>
          <td><strong>${e.nom}</strong></td>
          <td style="font-size:13px;">${e.filiere}</td>
          <td><span class="badge badge-bleu">${e.niveau}</span></td>
          <td>
            <div style="display:flex; flex-wrap:wrap; gap:4px;">
              ${e.profs
                .map(
                  (p) => `
                <span class="enroll-chip">
                  ${p.nom}
                  <button type="button" class="enroll-chip-remove" title="Retirer l'inscription"
                    onclick="supprimerInscription(${p.id})">×</button>
                </span>`
                )
                .join('')}
            </div>
          </td>
          <td style="font-size:12px;color:var(--gris-text);">${e.profs[0].semestre}</td>
        </tr>`
      )
      .join('');
  } catch (err) {
    console.error('Erreur inscriptions:', err);
  }
}

async function supprimerInscription(enrollmentId) {
  if (!confirm('Supprimer cette inscription ?')) return;

  try {
    const res = await fetchAdmin('/inscriptions/' + enrollmentId, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok) {
      chargerInscriptions();
    } else {
      alert(data.error);
    }
  } catch (err) {
    alert('Erreur serveur.');
  }
}

async function chargerStatutEval() {
  try {
    const res = await fetch(
      `${apiBase()}/public/statut-evaluations`
    );
    const data = await res.json();
    mettreAJourStatutEval(data.ouvertes);
  } catch (err) {
    console.error('Erreur statut eval:', err);
  }
}

function mettreAJourStatutEval(ouvertes) {
  const badge = document.getElementById('badge-statut-eval');
  const btn = document.getElementById('btn-toggle-eval');
  const txt = document.getElementById('txt-statut-eval');
  if (!badge || !btn || !txt) return;

  if (ouvertes) {
    badge.className = 'badge badge-vert';
    badge.textContent = 'Évaluations OUVERTES';
    btn.className = 'btn btn-outline';
    btn.style.cssText =
      'width:auto;padding:12px 24px;font-size:15px;color:var(--rouge);border-color:var(--rouge);';
    btn.textContent = 'Fermer les évaluations';
    txt.textContent =
      'Les étudiants peuvent noter leurs professeurs en ce moment.';
  } else {
    badge.className = 'badge badge-gris';
    badge.textContent = 'Évaluations FERMÉES';
    btn.className = 'btn btn-primary';
    btn.style.cssText = 'width:auto;padding:12px 24px;font-size:15px;';
    btn.textContent = 'Ouvrir les évaluations';
    txt.textContent = 'Les étudiants ne peuvent pas noter pour le moment.';
  }
}

async function toggleEvaluations() {
  try {
    const res = await fetch(
      `${apiBase()}/public/statut-evaluations`
    );
    const data = await res.json();
    const nouvelEtat = !data.ouvertes;

    const confirmation = confirm(
      nouvelEtat
        ? '⚠️ Ouvrir les évaluations ?\nLes étudiants pourront noter leurs professeurs.'
        : '⚠️ Fermer les évaluations ?\nLes étudiants ne pourront plus noter.'
    );

    if (!confirmation) return;

    await fetchAdmin('/parametres/evaluations_ouvertes', {
      method: 'PUT',
      body: JSON.stringify({ valeur: String(nouvelEtat) }),
    });

    mettreAJourStatutEval(nouvelEtat);
  } catch (err) {
    console.error('Erreur toggle eval:', err);
  }
}
function ouvrirModalEdit(id, nom, prenom, email) {
  document.getElementById('edit-user-id').value = id;
  document.getElementById('edit-nom').value = nom;
  document.getElementById('edit-prenom').value = prenom;
  document.getElementById('edit-email').value = email;
  document.getElementById('edit-alert-error').classList.remove('show');
  document.getElementById('edit-alert-success').classList.remove('show');
  document.getElementById('modal-edit-user').classList.add('open');
}

function fermerModalEdit() {
  document.getElementById('modal-edit-user').classList.remove('open');
}

async function sauvegarderUser() {
  const id = document.getElementById('edit-user-id').value;
  const nom = document.getElementById('edit-nom').value.trim();
  const prenom = document.getElementById('edit-prenom').value.trim();
  const email = document.getElementById('edit-email').value.trim();

  const errEl = document.getElementById('edit-alert-error');
  const sucEl = document.getElementById('edit-alert-success');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  try {
    const res = await fetchAdmin('/users/' + id, {
      method: 'PUT',
      body: JSON.stringify({ nom, prenom, email }),
    });
    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error;
      errEl.classList.add('show');
      return;
    }

    sucEl.textContent = 'Mis à jour avec succès !';
    sucEl.classList.add('show');
    setTimeout(() => {
      fermerModalEdit();
      chargerUtilisateurs();
    }, 1000);
  } catch (err) {
    errEl.textContent = 'Erreur serveur.';
    errEl.classList.add('show');
  }
}

async function chargerCommentaires() {
  try {
    const semestre = document.getElementById('filter-semestre')?.value || 'S2';
    const annee = document.getElementById('filter-annee')?.value || '2025-2026';
    
    const res = await fetchAdmin(`/commentaires?semestre=${semestre}&annee_academique=${annee}`);
    const data = await res.json();
    
    const container = document.getElementById('admin-comments-list');
    const badge = document.getElementById('badge-nb-comments');
    
    if (!data.commentaires || data.commentaires.length === 0) {
      container.innerHTML = '<div class="dash-empty">Aucun commentaire pour cette période.</div>';
      if (badge) badge.textContent = '0 commentaire';
      return;
    }
    
    if (badge) {
      badge.textContent = data.commentaires.length + ' commentaire' + (data.commentaires.length > 1 ? 's' : '');
    }
    
    container.innerHTML = data.commentaires.map(c => {
      const moyenne = ((c.note_clarte + c.note_maitrise + c.note_disponibilite + c.note_supports + c.note_ponctualite + c.note_engagement) / 6).toFixed(1);
      const date = new Date(c.created_at).toLocaleDateString('fr-FR');
      
      return `
        <div class="dash-comment" style="border-left: 3px solid var(--bleu); padding-left: 12px; margin-bottom: 16px;">
          <div style="font-size: 13px; color: var(--gris-text); margin-bottom: 4px;">
            <strong>${c.prof_prenom} ${c.prof_nom}</strong> · ${c.matiere} · ${date}
          </div>
          <div style="font-style: italic; color: #334155; margin-bottom: 8px;">« ${c.commentaire} »</div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; font-size: 12px;">
            <span class="badge badge-bleu" style="font-size: 11px;">⭐ ${moyenne}/5</span>
            <span class="badge" style="font-size: 11px; background: #f1f5f9; color: #64748b;">Clarté: ${c.note_clarte}</span>
            <span class="badge" style="font-size: 11px; background: #f1f5f9; color: #64748b;">Maîtrise: ${c.note_maitrise}</span>
            <span class="badge" style="font-size: 11px; background: #f1f5f9; color: #64748b;">Engagement: ${c.note_engagement}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Erreur chargement commentaires:', err);
    document.getElementById('admin-comments-list').innerHTML = '<div class="dash-empty">Erreur de chargement.</div>';
  }
}

// ── Gestion des années académiques ────────────────────────────────────────

async function chargerAnnees() {
  try {
    const res = await fetch(`${API}/admin/annees-academiques`, {
      headers: { Authorization: 'Bearer ' + getToken() }
    });
    const data = await res.json();
    
    const tbody = document.getElementById('tbody-annees');
    if (!tbody) return;
    
    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="dash-empty" style="text-align: center">Aucune année académique configurée</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(a => `
      <tr>
        <td><strong>${a.annee}</strong></td>
        <td><span class="badge badge-bleu">${a.semestre_actif}</span></td>
        <td>
          <span class="badge ${a.actif ? 'badge-vert' : 'badge-gris'}">
            ${a.actif ? 'Actif' : 'Inactif'}
          </span>
        </td>
        <td>
          <button type="button" class="btn btn-sm" onclick="toggleActifAnnee(${a.id}, ${a.actif})">
            ${a.actif ? 'Désactiver' : 'Activer'}
          </button>
          <button type="button" class="btn btn-sm btn-outline" onclick="changerSemestreAnnee(${a.id})">
            Changer semestre
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Erreur chargement années:', err);
    const tbody = document.getElementById('tbody-annees');
    if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="dash-empty" style="text-align: center">Erreur de chargement</td></tr>';
  }
}

function ouvrirModalAnnee() {
  document.getElementById('modal-annee').classList.add('open');
  document.getElementById('new-annee').value = '';
  document.getElementById('new-semestre-actif').value = 'S1';
  document.getElementById('annee-alert-error').classList.remove('show');
  document.getElementById('annee-alert-success').classList.remove('show');
}

function fermerModalAnnee() {
  document.getElementById('modal-annee').classList.remove('open');
}

async function ajouterAnnee() {
  const annee = document.getElementById('new-annee').value.trim();
  const semestreActif = document.getElementById('new-semestre-actif').value;
  
  // Validation
  if (!annee || !/^\d{4}-\d{4}$/.test(annee)) {
    showAlert('annee-alert-error', 'Format invalide (ex: 2026-2027)');
    return;
  }
  
  try {
    const res = await fetch(`${API}/admin/annees-academiques`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ annee, semestre_actif: semestreActif })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      showAlert('annee-alert-error', data.error || 'Erreur lors de l\'ajout');
      return;
    }
    
    showAlert('annee-alert-success', 'Année académique ajoutée avec succès');
    fermerModalAnnee();
    chargerAnnees();
  } catch (err) {
    showAlert('annee-alert-error', 'Erreur serveur');
  }
}

async function toggleActifAnnee(id, actif) {
  try {
    const res = await fetch(`${API}/admin/annees-academiques/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ actif: !actif })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      alert(data.error || 'Erreur lors de la modification');
      return;
    }
    
    chargerAnnees();
  } catch (err) {
    alert('Erreur serveur');
  }
}

async function changerSemestreAnnee(id) {
  const nouveauSemestre = prompt('Entrez le nouveau semestre (S1 ou S2):');
  
  if (!nouveauSemestre || !['S1', 'S2'].includes(nouveauSemestre)) {
    alert('Semestre invalide');
    return;
  }
  
  try {
    const res = await fetch(`${API}/admin/annees-academiques/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken()
      },
      body: JSON.stringify({ semestre_actif: nouveauSemestre })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      alert(data.error || 'Erreur lors de la modification');
      return;
    }
    
    chargerAnnees();
  } catch (err) {
    alert('Erreur serveur');
  }
}

// Charger les années académiques au démarrage
chargerAnnees();
