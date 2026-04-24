let profsDisponibles = [];
let profsSelectionnes = new Set();
let semestreActuel = 'S2';
let anneeActuelle = '2025-2026';

async function chargerProfs() {
  try {
    const [resP, resC] = await Promise.all([
      fetch('https://sup-management-intelligentsia-dlw2.onrender.com/api/public/professeurs'),
      fetch('https://sup-management-intelligentsia-dlw2.onrender.com/api/public/config'),
    ]);

    // Vérifier que la réponse est bien du JSON
    if (!resP.ok || !resC.ok) {
      throw new Error("API non disponible");
    }

    const contentTypeP = resP.headers.get("content-type");
    const contentTypeC = resC.headers.get("content-type");

    if (!contentTypeP.includes("application/json") || !contentTypeC.includes("application/json")) {
      throw new Error("Réponse non-JSON reçue");
    }
    const dataP = await resP.json();
    const dataC = await resC.json();

    profsDisponibles = dataP.professeurs || [];
    semestreActuel = dataC.semestre_actuel || 'S2';
    anneeActuelle = dataC.annee_academique || '2025-2026';

    console.log('Profs chargés:', profsDisponibles.length);
  } catch (err) {
    console.error('Erreur chargement:', err);
    profsDisponibles = [];
  }
}

// Charger dès le départ
chargerProfs();

function passerEtape2() {
  const nom = document.getElementById('reg-nom').value.trim();
  const prenom = document.getElementById('reg-prenom').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const numero = document.getElementById('reg-numero').value.trim();
  const filiere = document.getElementById('reg-filiere').value;
  const niveau = document.getElementById('reg-niveau').value;

  if (
    !nom ||
    !prenom ||
    !email ||
    !password ||
    !numero ||
    !filiere ||
    !niveau
  ) {
    showAlert('error', 'Veuillez remplir tous les champs.');
    return;
  }
  if (password.length < 6) {
    showAlert('error', 'Mot de passe trop court (6 caractères minimum).');
    return;
  }

  document.getElementById('alert-error').classList.remove('show');
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'block';

  const code = document.getElementById('reg-code').value.trim();
  if (!code) {
    showAlert('error', "Code d'inscription requis.");
    return;
  }

  // Recharger si vide
  if (profsDisponibles.length === 0) {
    chargerProfs().then(() => afficherProfs());
  } else {
    afficherProfs();
  }
}

function retourEtape1() {
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-1').style.display = 'block';
}

function afficherProfs() {
  const container = document.getElementById('profs-liste');

  if (profsDisponibles.length === 0) {
    container.innerHTML = `
      <div style="color:var(--gris-text);font-size:14px;padding:1rem;text-align:center;">
        Aucun professeur disponible.<br>
        <button onclick="chargerProfs().then(()=>afficherProfs())"
          style="margin-top:8px;background:var(--bleu);color:white;border:none;
          padding:6px 14px;border-radius:6px;cursor:pointer;font-size:13px;">
          Réessayer
        </button>
      </div>`;
    return;
  }

  container.innerHTML = '';
  profsSelectionnes.clear();
  document.getElementById('count-selectionnes').textContent = '0';

  profsDisponibles.forEach((p) => {
    const div = document.createElement('div');
    div.style.cssText = `
      display:flex; align-items:center; gap:12px;
      padding:12px 14px;
      border:1.5px solid var(--gris-border);
      border-radius:var(--radius-sm);
      cursor:pointer; transition:all 0.2s; background:white;
      margin-bottom:2px;
    `;

    const checkBox = document.createElement('div');
    checkBox.id = 'check-' + p.id;
    checkBox.style.cssText = `
      width:20px; height:20px; border-radius:5px;
      border:2px solid var(--gris-border);
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0; transition:all 0.2s;
    `;

    const info = document.createElement('div');
    info.style.flex = '1';
    info.innerHTML = `
      <div style="font-size:14px;font-weight:600;color:#1E293B;">${p.prenom} ${p.nom}</div>
      <div style="font-size:12px;color:var(--gris-text);">${p.matiere}${p.departement ? ' · ' + p.departement : ''}</div>
    `;

    div.appendChild(checkBox);
    div.appendChild(info);
    div.addEventListener('click', () => toggleProf(p.id, div));
    container.appendChild(div);
  });
}

function toggleProf(profId, div) {
  const check = document.getElementById('check-' + profId);

  if (profsSelectionnes.has(profId)) {
    profsSelectionnes.delete(profId);
    div.style.borderColor = 'var(--gris-border)';
    div.style.background = 'white';
    check.style.borderColor = 'var(--gris-border)';
    check.style.background = 'white';
    check.innerHTML = '';
  } else {
    profsSelectionnes.add(profId);
    div.style.borderColor = 'var(--bleu)';
    div.style.background = 'var(--bleu-light)';
    check.style.borderColor = 'var(--bleu)';
    check.style.background = 'var(--bleu)';
    check.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12">
      <polyline points="2,6 5,9 10,3" fill="none" stroke="white"
      stroke-width="2" stroke-linecap="round"/></svg>`;
  }

  document.getElementById('count-selectionnes').textContent =
    profsSelectionnes.size;
}

async function soumettre() {
  if (profsSelectionnes.size === 0) {
    showAlert('error', 'Sélectionnez au moins un professeur.');
    return;
  }

  const btn = document.getElementById('btn-inscrire');
  btn.textContent = 'Création du compte...';
  btn.disabled = true;

  const body = {
    nom: document.getElementById('reg-nom').value.trim(),
    prenom: document.getElementById('reg-prenom').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    numero_etudiant: document.getElementById('reg-numero').value.trim(),
    filiere: document.getElementById('reg-filiere').value,
    niveau: document.getElementById('reg-niveau').value,
    professeurs: Array.from(profsSelectionnes),
    semestre: semestreActuel,
    annee_academique: anneeActuelle,
    code_inscription: document
      .getElementById('reg-code')
      .value.trim()
      .toUpperCase(),
  };

  try {
    const res = await fetch(
      'https://sup-management-intelligentsia-dlw2.onrender.com/api/auth/register-etudiant',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showAlert('error', data.error || 'Erreur lors de la création du compte.');
      btn.textContent = 'Créer mon compte';
      btn.disabled = false;
      return;
    }

    document.getElementById('step-2').style.display = 'none';
    showAlert('success', 'Compte créé ! Redirection vers la connexion...');
    setTimeout(() => {
      window.location.href = '/pages/login.html';
    }, 2000);
  } catch (err) {
    showAlert('error', 'Erreur serveur. Réessayez.');
    btn.textContent = 'Créer mon compte';
    btn.disabled = false;
  }
}

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
