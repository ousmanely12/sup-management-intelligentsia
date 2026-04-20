const user = requireAuth('admin');

if (user) {
  document.getElementById('nav-user').textContent = user.prenom + ' ' + user.nom;
  chargerDashboard();
  chargerUtilisateurs();
  chargerSelectsInscription();
  chargerCodes();
  chargerInscriptions();
}


async function fetchAdmin(url, options = {}) {
  const res = await fetch('http://localhost:3000/api/admin' + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken(),
      ...(options.headers || {})
    }
  });
  return res;
}

async function chargerDashboard() {
  try {
    const res = await fetchAdmin('/stats');
    const data = await res.json();
    document.getElementById('stat-profs').textContent = data.total_profs || 0;
    document.getElementById('stat-etudiants').textContent = data.total_etudiants || 0;
    document.getElementById('stat-evals').textContent = data.total_evals || 0;
    document.getElementById('stat-moy').textContent = data.moyenne_generale
      ? parseFloat(data.moyenne_generale).toFixed(1) + '/5' : '--';

    const tbody = document.getElementById('tbody-profs');
    if (!data.classement || data.classement.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--gris-text);">Aucune évaluation encore.</td></tr>';
      return;
    }

    tbody.innerHTML = data.classement.map((p, i) => {
      const moy = parseFloat(p.moyenne_generale || 0).toFixed(1);
      const couleurMoy = moy >= 4 ? 'color:var(--vert);font-weight:600;'
        : moy >= 3 ? 'color:var(--orange);font-weight:600;'
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
        <td style="${couleurMoy}">${moy}/5</td>
      </tr>`;
    }).join('');
  } catch (err) {
    console.error('Erreur stats:', err);
  }
}

async function chargerUtilisateurs() {
  try {
    const res = await fetchAdmin('/users');
    const data = await res.json();
    const tbody = document.getElementById('tbody-users');

    tbody.innerHTML = data.users.map(u => `
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
        <td>
          <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;"
            onclick="toggleUser(${u.id}, ${u.actif})">
            ${u.actif ? 'Désactiver' : 'Activer'}
          </button>
        </td>
      </tr>`).join('');
  } catch (err) {
    console.error('Erreur users:', err);
  }
}

async function chargerSelectsInscription() {
  try {
    const [resE, resP] = await Promise.all([
      fetchAdmin('/etudiants'),
      fetchAdmin('/professeurs')
    ]);
    const dataE = await resE.json();
    const dataP = await resP.json();

    document.getElementById('sel-etudiant').innerHTML =
      dataE.etudiants.map(e => `<option value="${e.id}">${e.prenom} ${e.nom} (${e.filiere})</option>`).join('');

    document.getElementById('sel-prof').innerHTML =
      dataP.professeurs.map(p => `<option value="${p.id}">${p.prenom} ${p.nom} — ${p.matiere}</option>`).join('');
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
        annee_academique: '2024-2025'
      })
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
  document.getElementById('champs-prof').style.display = role === 'professeur' ? 'block' : 'none';
  document.getElementById('champs-etudiant').style.display = role === 'etudiant' ? 'block' : 'none';
}

function ouvrirModalUser() {
  document.querySelectorAll('.alert').forEach(a => a.classList.remove('show'));
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
    niveau: document.getElementById('new-niveau').value.trim()
  };

  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + getToken()
      },
      body: JSON.stringify(body)
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--gris-text);">Aucun code.</td></tr>';
        return;
      }
  
      tbody.innerHTML = data.codes.map(c => `
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
          <td>
            <button class="btn btn-outline" style="padding:4px 10px;font-size:12px;"
              onclick="toggleCode(${c.id}, ${c.actif})">
              ${c.actif ? 'Désactiver' : 'Activer'}
            </button>
          </td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erreur codes:', err);
    }
  }
  
  async function toggleCode(codeId, actifActuel) {
    await fetchAdmin('/codes/' + codeId + '/toggle', { method: 'PUT' });
    chargerCodes();
  }
  
  async function genererCode() {
    const code = 'SMI-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    const description = prompt('Description du code (ex: Promotion 2025-2026) :');
    if (description === null) return;
  
    await fetchAdmin('/codes', {
      method: 'POST',
      body: JSON.stringify({ code, description, max_usage: 999 })
    });
    chargerCodes();
  }

  async function chargerInscriptions() {
    try {
      const res = await fetchAdmin('/inscriptions');
      const data = await res.json();
      const tbody = document.getElementById('tbody-inscriptions');
  
      if (!data.inscriptions || data.inscriptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--gris-text);">Aucune inscription.</td></tr>';
        return;
      }
  
      tbody.innerHTML = data.inscriptions.map(i => `
        <tr>
          <td><strong>${i.etu_prenom} ${i.etu_nom}</strong></td>
          <td style="font-size:13px;">${i.filiere}</td>
          <td><span class="badge badge-bleu">${i.niveau}</span></td>
          <td>${i.prof_prenom} ${i.prof_nom}</td>
          <td style="font-size:13px;">${i.matiere}</td>
          <td><span class="badge badge-gris">${i.semestre} ${i.annee_academique}</span></td>
          <td>
            <button class="btn" style="padding:4px 10px;font-size:12px;color:var(--rouge);
              border:1px solid var(--rouge);border-radius:6px;background:transparent;cursor:pointer;"
              onclick="supprimerInscription(${i.enrollment_id})">
              Supprimer
            </button>
          </td>
        </tr>`).join('');
    } catch (err) {
      console.error('Erreur inscriptions:', err);
    }
  }
  
  async function supprimerInscription(enrollmentId) {
    if (!confirm('Supprimer cette inscription ?')) return;
  
    try {
      const res = await fetchAdmin('/inscriptions/' + enrollmentId, { method: 'DELETE' });
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