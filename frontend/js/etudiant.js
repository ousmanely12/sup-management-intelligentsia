const user = requireAuth('etudiant');

let profSelectionne = null;
const notes = {
  clarte: 0,
  maitrise: 0,
  disponibilite: 0,
  supports: 0,
  ponctualite: 0,
};

if (user) {
  document.getElementById('nav-user').textContent =
    user.prenom + ' ' + user.nom;
  document.getElementById('welcome-title').textContent =
    'Bonjour, ' + user.prenom + ' !';

  // Afficher filière et niveau
  const badgeFiliere = document.getElementById('badge-filiere');
  const badgeNiveau = document.getElementById('badge-niveau');

  if (badgeFiliere && user.filiere) badgeFiliere.textContent = user.filiere;
  if (badgeNiveau && user.niveau) badgeNiveau.textContent = user.niveau;

  chargerProfesseurs();
  initEtoiles();
}

async function chargerProfesseurs() {
  const token = getToken();
  try {
    const res = await fetch(`${API}/etudiant/professeurs`, {
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
        '<div style="padding:1rem;color:var(--gris-text);">Aucun professeur trouvé.</div>';
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
        btn.className = 'btn btn-primary';
        btn.style.cssText = 'padding:8px 14px; font-size:13px;';
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
  ['clarte', 'maitrise', 'disponibilite', 'supports', 'ponctualite'].forEach(
    (critere) => {
      const container = document.getElementById('stars-' + critere);
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
  ['clarte', 'maitrise', 'disponibilite', 'supports', 'ponctualite'].forEach(
    (c) => {
      majEtoiles(document.getElementById('stars-' + c), 0);
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
  const confirmation = confirm(
    `Confirmer votre évaluation pour ${nomProf} ?\n\n` +
      `Clarté : ${notes.clarte}/5\n` +
      `Maîtrise : ${notes.maitrise}/5\n` +
      `Disponibilité : ${notes.disponibilite}/5\n` +
      `Supports : ${notes.supports}/5\n` +
      `Ponctualité : ${notes.ponctualite}/5\n\n` +
      `⚠️ Cette action est irréversible.`
  );

  if (!confirmation) return;

  const btn = document.getElementById('btn-soumettre');
  btn.textContent = 'Envoi...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/etudiant/evaluer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({
        professeur_id: profSelectionne,
        semestre: 'S2',
        annee_academique: '2025-2026',
        note_clarte: notes.clarte,
        note_maitrise: notes.maitrise,
        note_disponibilite: notes.disponibilite,
        note_supports: notes.supports,
        note_ponctualite: notes.ponctualite,
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
      chargerProfesseurs();
    }, 1200);
  } catch (err) {
    showModalAlert('error', 'Erreur serveur.');
    btn.textContent = "Envoyer l'évaluation";
    btn.disabled = false;
  }
}
function showModalAlert(type, message) {
  document.getElementById('modal-alert-error').classList.remove('show');
  document.getElementById('modal-alert-success').classList.remove('show');
  const el = document.getElementById('modal-alert-' + type);
  if (el) {
    el.textContent = message;
    el.classList.add('show');
  }
}
