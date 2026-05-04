const user = requireAuth('etudiant');

let profSelectionne = null;
const notes = {
  clarte: 0,
  maitrise: 0,
  disponibilite: 0,
  supports: 0,
  ponctualite: 0,
  engagement: 0,
};

if (user) {
  document.getElementById('nav-user').textContent =
    user.prenom + ' ' + user.nom;
  document.getElementById('welcome-title').textContent =
    'Bonjour, ' + user.prenom + ' !';

  // Afficher filière et niveau
  const badgeFiliere = document.getElementById('badge-filiere');
  const badgeNiveau = document.getElementById('badge-niveau');
  const badgeSemestre = document.getElementById('badge-semestre');

  if (badgeFiliere && user.filiere) badgeFiliere.textContent = user.filiere;
  if (badgeNiveau && user.niveau) badgeNiveau.textContent = user.niveau;
  
  // Afficher le semestre et l'année sauvegardés
  const semestre = user.semestre || 'S2';
  const annee = user.annee_academique || '2025-2026';
  if (badgeSemestre) badgeSemestre.textContent = `${semestre} — ${annee}`;

  // Charger les professeurs avec le semestre sauvegardé
  chargerProfesseurs(semestre, annee);
  initEtoiles();
}

async function chargerProfesseurs(semestre = 'S2', annee = '2025-2026') {
  const token = getToken();
  try {
    const res = await fetch(`${API}/etudiant/professeurs?semestre=${semestre}&annee_academique=${annee}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const grid = document.getElementById('prof-grid');
    const total = data.professeurs.length;
    document.getElementById('badge-count').textContent =
      total + ' professeur' + (total > 1 ? 's' : '');

    grid.innerHTML = '';

    if (total === 0) {
      grid.innerHTML =
        '<div class="dash-empty">Aucun professeur trouvé.</div>';
      return;
    }

    data.professeurs.forEach((p) => {
      const estInscrit = Number(p.inscrit) === 1;
      const dejaNote = Number(p.deja_note) === 1;
      const initiales = p.prenom[0] + p.nom[0];

      const card = document.createElement('div');
      card.className =
        'prof-card' +
        (!estInscrit ? ' locked' : '') +
        (dejaNote ? ' deja-note' : '');

      const avatar = document.createElement('div');
      avatar.className = 'prof-avatar';
      avatar.textContent = initiales;

      const nom = document.createElement('div');
      nom.className = 'prof-nom';
      nom.textContent = p.prenom + ' ' + p.nom;

      const matiere = document.createElement('div');
      matiere.className = 'prof-matiere';
      matiere.textContent =
        p.matiere + (p.departement ? ' · ' + p.departement : '');

      const badge = document.createElement('span');
      badge.className = 'badge';

      card.appendChild(avatar);
      card.appendChild(nom);
      card.appendChild(matiere);
      card.appendChild(badge);

      if (!estInscrit) {
        badge.className += ' badge-gris';
        badge.textContent = 'Pas votre cours';
        const lock = document.createElement('div');
        lock.style.marginTop = '8px';
        const lockBadge = document.createElement('span');
        lockBadge.className = 'badge badge-lock';
        lockBadge.textContent = 'Verrouillé';
        lock.appendChild(lockBadge);
        card.appendChild(lock);
      } else if (dejaNote) {
        badge.className += ' badge-vert';
        badge.textContent = 'Déjà évalué';
        const merci = document.createElement('div');
        merci.style.marginTop = '8px';
        const merciBadge = document.createElement('span');
        merciBadge.className = 'badge badge-vert';
        merciBadge.textContent = 'Merci !';
        merci.appendChild(merciBadge);
        card.appendChild(merci);
      } else {
        badge.className += ' badge-orange';
        badge.textContent = 'À évaluer';
        const btnDiv = document.createElement('div');
        btnDiv.style.marginTop = '10px';
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.textContent = 'Évaluer';
        btn.addEventListener('click', () => {
          ouvrirModal(p.prof_id, p.prenom + ' ' + p.nom, p.matiere);
        });
        btnDiv.appendChild(btn);
        card.appendChild(btnDiv);
      }

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Erreur chargement profs:', err);
  }
}
function initEtoiles() {
  ['clarte', 'maitrise', 'disponibilite', 'supports', 'ponctualite', 'engagement'].forEach(
    (critere) => {
      const container = document.getElementById('stars-' + critere);
      if (!container) return; // Sécurité si l'élément n'existe pas encore
      container.innerHTML = '';
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('span');
        star.textContent = '★';
        star.dataset.val = i;
        star.addEventListener('click', () => {
          notes[critere] = i;
          majEtoiles(container, i);
        });
        star.addEventListener('mouseover', () => majEtoiles(container, i));
        star.addEventListener('mouseout', () =>
          majEtoiles(container, notes[critere])
        );
        container.appendChild(star);
      }
    }
  );
}

function majEtoiles(container, valeur) {
  container.querySelectorAll('span').forEach((s) => {
    s.classList.toggle('active', parseInt(s.dataset.val) <= valeur);
  });
}

function ouvrirModal(profId, nom, matiere) {
  profSelectionne = profId;
  Object.keys(notes).forEach((k) => (notes[k] = 0));
  ['clarte', 'maitrise', 'disponibilite', 'supports', 'ponctualite', 'engagement'].forEach(
    (c) => {
      const container = document.getElementById('stars-' + c);
      if (container) majEtoiles(container, 0);
    }
  );
  document.getElementById('commentaire').value = '';
  document.getElementById('modal-prof-nom').textContent = 'Évaluer : ' + nom;
  document
    .querySelectorAll('.alert')
    .forEach((a) => a.classList.remove('show'));
  document.getElementById('modal-notation').classList.add('open');
}

function fermerModal() {
  document.getElementById('modal-notation').classList.remove('open');
  profSelectionne = null;
}

async function soumettreEvaluation() {
  const criteres = [
    'clarte',
    'maitrise',
    'disponibilite',
    'supports',
    'ponctualite',
    'engagement',
  ];
  for (const c of criteres) {
    if (!notes[c]) {
      showModalAlert('error', 'Veuillez noter tous les critères.');
      return;
    }
  }

  // Confirmation avant envoi
  const nomProf = document
    .getElementById('modal-prof-nom')
    .textContent.replace('Évaluer : ', '');
  const semestreConfirm = user.semestre || 'S2';
  const anneeConfirm = user.annee_academique || '2025-2026';
  const confirmation = confirm(
    `Confirmer votre évaluation pour ${nomProf} ?\n` +
      `Période : ${semestreConfirm} — ${anneeConfirm}\n\n` +
      `Clarté : ${notes.clarte}/5\n` +
      `Maîtrise : ${notes.maitrise}/5\n` +
      `Disponibilité : ${notes.disponibilite}/5\n` +
      `Supports : ${notes.supports}/5\n` +
      `Ponctualité : ${notes.ponctualite}/5\n` +
      `Engagement : ${notes.engagement}/5\n\n` +
      `⚠️ Cette action est irréversible.`
  );

  if (!confirmation) return;

  const btn = document.getElementById('btn-soumettre');
  btn.textContent = 'Envoi...';
  btn.disabled = true;

  try {
    // Utiliser le semestre sauvegardé dans le profil
    const semestreEval = user.semestre || 'S2';
    const anneeEval = user.annee_academique || '2025-2026';
    
    const res = await fetch(`${API}/etudiant/evaluer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({
        professeur_id: profSelectionne,
        semestre: semestreEval,
        annee_academique: anneeEval,
        note_clarte: notes.clarte,
        note_maitrise: notes.maitrise,
        note_disponibilite: notes.disponibilite,
        note_supports: notes.supports,
        note_ponctualite: notes.ponctualite,
        note_engagement: notes.engagement,
        commentaire:
          document.getElementById('commentaire').value.trim() || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showModalAlert('error', data.error || "Erreur lors de l'envoi.");
      btn.textContent = "Envoyer l'évaluation";
      btn.disabled = false;
      return;
    }

    showModalAlert('success', 'Évaluation envoyée avec succès !');
    setTimeout(() => {
      fermerModal();
      // Recharger avec le semestre actuel
      const semestreReload = user.semestre || 'S2';
      const anneeReload = user.annee_academique || '2025-2026';
      chargerProfesseurs(semestreReload, anneeReload);
    }, 1200);
  } catch (err) {
    showModalAlert('error', 'Erreur serveur.');
    btn.textContent = "Envoyer l'évaluation";
    btn.disabled = false;
  }
}
function showModalAlert(type, message) {
  const alertEl = document.getElementById('modal-alert-' + type);
  if (alertEl) {
    alertEl.textContent = message;
    alertEl.classList.add('show');
    setTimeout(() => alertEl.classList.remove('show'), 4000);
  }
}

// ── Fonctions pour le modal de mise à jour ─────────────────────
let majProfesseursSelectionnes = [];

function ouvrirModalMiseAJour() {
  document.getElementById('modal-miseajour').classList.add('open');
  chargerProfesseursPourMiseAJour();
  // Pré-remplir avec les valeurs sauvegardées
  if (user) {
    document.getElementById('maj-semestre').value = user.semestre || 'S2';
    document.getElementById('maj-annee').value = user.annee_academique || '2025-2026';
    if (user.niveau) {
      document.getElementById('maj-niveau').value = user.niveau;
    }
  }
}

function fermerModalMiseAJour() {
  document.getElementById('modal-miseajour').classList.remove('open');
  majProfesseursSelectionnes = [];
  // Cacher les alertes
  document.getElementById('maj-alert-error').classList.remove('show');
  document.getElementById('maj-alert-success').classList.remove('show');
}

async function chargerProfesseursPourMiseAJour() {
  const container = document.getElementById('maj-profs-list');
  const token = getToken();

  try {
    const res = await fetch(`${API}/etudiant/professeurs`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    container.innerHTML = '';

    if (data.professeurs.length === 0) {
      container.innerHTML = '<div class="maj-loading">Aucun professeur disponible.</div>';
      return;
    }

    data.professeurs.forEach(prof => {
      const profItem = document.createElement('div');
      profItem.className = 'maj-prof-item';
      profItem.dataset.profId = prof.prof_id;

      profItem.innerHTML = `
        <div class="maj-prof-checkbox"></div>
        <div class="maj-prof-info">
          <div class="maj-prof-name">${prof.nom} ${prof.prenom}</div>
          <div class="maj-prof-matiere">${prof.matiere}</div>
        </div>
      `;

      profItem.addEventListener('click', () => toggleProfSelection(prof.prof_id, profItem));
      container.appendChild(profItem);
    });

  } catch (err) {
    container.innerHTML = '<div class="maj-loading">Erreur lors du chargement.</div>';
  }
}

function toggleProfSelection(profId, element) {
  console.log('Toggle sélection - profId:', profId, 'Array actuel:', majProfesseursSelectionnes);
  const index = majProfesseursSelectionnes.indexOf(profId);

  if (index > -1) {
    // Désélectionner
    majProfesseursSelectionnes.splice(index, 1);
    element.classList.remove('selected');
    console.log('Désélectionné - Nouvel array:', majProfesseursSelectionnes);
  } else {
    // Sélectionner
    majProfesseursSelectionnes.push(profId);
    element.classList.add('selected');
    console.log('Sélectionné - Nouvel array:', majProfesseursSelectionnes);
  }
}

async function validerMiseAJour() {
  const semestre = document.getElementById('maj-semestre').value;
  const annee = document.getElementById('maj-annee').value;
  const niveau = document.getElementById('maj-niveau').value;

  // Validation
  if (!semestre || !annee || !niveau) {
    showMajAlert('error', 'Veuillez remplir tous les champs.');
    return;
  }

  console.log('Validation - Professeurs sélectionnés:', majProfesseursSelectionnes, 'Longueur:', majProfesseursSelectionnes.length);
  if (majProfesseursSelectionnes.length === 0) {
    showMajAlert('error', 'Veuillez sélectionner au moins un professeur.');
    return;
  }

  const btn = document.getElementById('btn-valider-maj');
  btn.textContent = 'Mise à jour...';
  btn.disabled = true;

  try {
    const token = getToken();
    const res = await fetch(`${API}/etudiant/mettre-a-jour`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      body: JSON.stringify({
        semestre: semestre,
        annee_academique: annee,
        niveau: niveau,
        professeurs: majProfesseursSelectionnes,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      showMajAlert('error', data.error || 'Erreur lors de la mise à jour.');
      btn.textContent = 'Valider la mise à jour';
      btn.disabled = false;
      return;
    }

    showMajAlert('success', 'Mise à jour effectuée avec succès !');

    // Mettre à jour les badges
    if (document.getElementById('badge-semestre')) {
      document.getElementById('badge-semestre').textContent = `${semestre} — ${annee}`;
    }
    if (document.getElementById('badge-niveau')) {
      document.getElementById('badge-niveau').textContent = niveau;
    }

    // Mettre à jour l'objet user global et localStorage
    user.niveau = niveau;
    user.semestre = semestre;
    user.annee_academique = annee;
    localStorage.setItem('user', JSON.stringify(user));

    setTimeout(() => {
      fermerModalMiseAJour();
      // Recharger la liste des professeurs avec le nouveau semestre
      chargerProfesseurs(semestre, annee);
    }, 1500);

  } catch (err) {
    showMajAlert('error', 'Erreur serveur.');
    btn.textContent = 'Valider la mise à jour';
    btn.disabled = false;
  }
}

async function chargerProfesseursAvecNouveauSemestre(semestre, annee) {
  const token = getToken();
  try {
    const res = await fetch(`${API}/etudiant/professeurs?semestre=${semestre}&annee_academique=${annee}`, {
      headers: { Authorization: 'Bearer ' + token },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    const grid = document.getElementById('prof-grid');
    const total = data.professeurs.length;
    document.getElementById('badge-count').textContent =
      total + ' professeur' + (total > 1 ? 's' : '');

    grid.innerHTML = '';

    if (total === 0) {
      grid.innerHTML =
        '<div class="dash-empty">Aucun professeur trouvé pour ce semestre.</div>';
      return;
    }

    data.professeurs.forEach((p) => {
      const estInscrit = Number(p.inscrit) === 1;
      const dejaNote = Number(p.deja_note) === 1;
      const initiales = p.prenom[0] + p.nom[0];

      const card = document.createElement('div');
      card.className =
        'prof-card' +
        (!estInscrit ? ' locked' : '') +
        (dejaNote ? ' deja-note' : '');

      const avatar = document.createElement('div');
      avatar.className = 'prof-avatar';
      avatar.textContent = initiales;

      const nom = document.createElement('div');
      nom.className = 'prof-nom';
      nom.textContent = p.prenom + ' ' + p.nom;

      const matiere = document.createElement('div');
      matiere.className = 'prof-matiere';
      matiere.textContent =
        p.matiere + (p.departement ? ' · ' + p.departement : '');

      const badge = document.createElement('span');
      badge.className = 'badge';

      card.appendChild(avatar);
      card.appendChild(nom);
      card.appendChild(matiere);
      card.appendChild(badge);

      if (!estInscrit) {
        badge.className += ' badge-gris';
        badge.textContent = 'Pas votre cours';
        const lock = document.createElement('div');
        lock.style.marginTop = '8px';
        const lockBadge = document.createElement('span');
        lockBadge.className = 'badge badge-lock';
        lockBadge.textContent = 'Verrouillé';
        lock.appendChild(lockBadge);
        card.appendChild(lock);
      } else if (dejaNote) {
        badge.className += ' badge-vert';
        badge.textContent = 'Déjà évalué';
        const merci = document.createElement('div');
        merci.style.marginTop = '8px';
        const merciBadge = document.createElement('span');
        merciBadge.className = 'badge badge-vert';
        merciBadge.textContent = 'Merci !';
        merci.appendChild(merciBadge);
        card.appendChild(merci);
      } else {
        badge.className += ' badge-orange';
        badge.textContent = 'À évaluer';
        const btnDiv = document.createElement('div');
        btnDiv.style.marginTop = '10px';
        const btn = document.createElement('button');
        btn.className = 'btn btn-primary btn-sm';
        btn.textContent = 'Évaluer';
        btn.addEventListener('click', () => {
          ouvrirModal(p.prof_id, p.prenom + ' ' + p.nom, p.matiere);
        });
        btnDiv.appendChild(btn);
        card.appendChild(btnDiv);
      }

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Erreur chargement profs:', err);
    document.getElementById('prof-grid').innerHTML = 
      '<div class="dash-empty">Erreur lors du chargement.</div>';
  }
}

function showMajAlert(type, message) {
  const alertEl = document.getElementById('maj-alert-' + type);
  if (alertEl) {
    alertEl.textContent = message;
    alertEl.classList.add('show');
    setTimeout(() => alertEl.classList.remove('show'), 4000);
  }
}
