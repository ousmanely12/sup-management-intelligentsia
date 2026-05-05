const API = window.location.origin + '/api';

function ouvrirModalPassword() {
  document.getElementById('pwd-ancien').value = '';
  document.getElementById('pwd-nouveau').value = '';
  document.getElementById('pwd-confirmer').value = '';
  document.getElementById('pwd-alert-error').classList.remove('show');
  document.getElementById('pwd-alert-success').classList.remove('show');
  document.getElementById('modal-password').classList.add('open');
}

function fermerModalPassword() {
  document.getElementById('modal-password').classList.remove('open');
}

async function changerMotDePasse() {
  const ancien = document.getElementById('pwd-ancien').value;
  const nouveau = document.getElementById('pwd-nouveau').value;
  const confirmer = document.getElementById('pwd-confirmer').value;

  const errEl = document.getElementById('pwd-alert-error');
  const sucEl = document.getElementById('pwd-alert-success');
  errEl.classList.remove('show');
  sucEl.classList.remove('show');

  if (!ancien || !nouveau || !confirmer) {
    errEl.textContent = 'Veuillez remplir tous les champs.';
    errEl.classList.add('show');
    return;
  }

  if (nouveau !== confirmer) {
    errEl.textContent = 'Les deux nouveaux mots de passe ne correspondent pas.';
    errEl.classList.add('show');
    return;
  }

  if (nouveau.length < 6) {
    errEl.textContent =
      'Nouveau mot de passe trop court (6 caractères minimum).';
    errEl.classList.add('show');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/change-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + getToken(),
      },
      body: JSON.stringify({
        ancien_password: ancien,
        nouveau_password: nouveau,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Erreur.';
      errEl.classList.add('show');
      return;
    }

    sucEl.textContent = 'Mot de passe modifié ! Reconnectez-vous.';
    sucEl.classList.add('show');
    setTimeout(() => {
      fermerModalPassword();
      logout();
    }, 2000);
  } catch (err) {
    errEl.textContent = 'Erreur serveur.';
    errEl.classList.add('show');
  }
}
