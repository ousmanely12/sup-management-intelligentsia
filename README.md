# 🎓 SMI PULSE - Plateforme d'Évaluation Pédagogique

**SMI PULSE** est la plateforme moderne d'évaluation pédagogique de **Sup Management Intelligentsia**, permettant aux étudiants d'évaluer la qualité de l'enseignement de manière anonyme et constructive.

## Fonctionnalités

###  Pour les étudiants
- **Évaluations anonymes** : Évaluez vos professeurs en toute confidentialité
- **Interface intuitive** : Design moderne et responsive pour tous les appareils
- **Feedback constructif** : Partagez votre expérience pédagogique
- **Accès sécurisé** : Inscription par code d'inscription fourni par l'administration

###  Pour les professeurs
- **Tableau de bord** : Visualisez vos évaluations et statistiques
- **Analyses détaillées** : Graphiques et tendances par critère
- **Amélioration continue** : Identifiez vos points forts et axes d'amélioration
- **Export des données** : Téléchargez vos rapports d'évaluation

### 🔧 Pour les administrateurs
- **Gestion des utilisateurs** : Créez et gérez les comptes étudiants/professeurs
- **Configuration des semestres** : Définissez les périodes d'évaluation
- **Statistiques globales** : Vue d'ensemble de la qualité pédagogique
- **Gestion des codes** : Générez et distribuez les codes d'inscription

## 🚀 Déploiement

### En ligne
🌐 **Application déployée** : [https://sup-management-intelligentsia-dlw2.onrender.com](https://sup-management-intelligentsia-dlw2.onrender.com)

### Installation locale

#### Prérequis
- Node.js (v14 ou supérieur)
- PostgreSQL (pour la production)
- npm ou yarn

#### Étapes d'installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/ousmanely12/sup-management-intelligentsia.git
   cd sup-management-intelligentsia
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Configurer la base de données**
   ```bash
   # Créer la base de données PostgreSQL
   # Configurer les variables d'environnement dans .env
   cp .env.example .env
   # Éditer .env avec vos informations de base de données
   ```

4. **Initialiser la base de données**
   ```bash
   npm run init-db
   ```

5. **Démarrer l'application**
   ```bash
   # Développement
   npm run dev
   
   # Production
   npm start
   ```

## 📱 Technologies

### Backend
- **Node.js** : Runtime JavaScript
- **Express.js** : Framework web
- **PostgreSQL** : Base de données relationnelle
- **JWT** : Authentification sécurisée
- **bcrypt** : Hashage des mots de passe
- **Helmet** : Sécurité HTTP
- **Rate Limiting** : Protection contre les attaques

### Frontend
- **HTML5 / CSS3** : Structure et style
- **JavaScript (ES6+)** : Logique client
- **Responsive Design** : Compatible mobile/tablette/desktop
- **Chart.js** : Visualisation des données
- **SEO Optimisé** : Meta tags, Open Graph, Twitter Cards

## 🏗️ Architecture du projet

```
sup-management/
├── backend/                 # API REST
│   ├── config/             # Configuration base de données
│   ├── middleware/         # Middlewares personnalisés
│   ├── routes/             # Routes API
│   │   ├── admin.js        # Routes administrateur
│   │   ├── auth.js         # Authentification
│   │   ├── etudiant.js     # Étudiants
│   │   ├── professeur.js   # Professeurs
│   │   └── public.js       # Routes publiques
│   ├── server.js           # Serveur principal
│   └── schema.sql          # Schéma base de données
├── frontend/               # Application web
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript client
│   ├── pages/             # Pages HTML
│   └── index.html         # Point d'entrée
├── .env                   # Variables d'environnement
├── .gitignore            # Fichiers ignorés par Git
├── package.json          # Dépendances et scripts
└── README.md             # Documentation
```

## 🔐 Sécurité

- **Authentification JWT** : Tokens sécurisés avec expiration
- **Hashage bcrypt** : Protection des mots de passe
- **Rate Limiting** : Limitation des requêtes
- **CORS configuré** : Contrôle des accès cross-origin
- **Helmet.js** : En-têtes de sécurité HTTP
- **Validation des entrées** : Protection contre les injections

## 📊 SEO & Performance

- **Meta tags optimisés** : Description, mots-clés, auteurs
- **Open Graph** : Partage optimisé sur réseaux sociaux
- **Twitter Cards** : Aperçus attractifs sur Twitter
- **Responsive Design** : Adaptation tous écrans
- **Performance** : Code optimisé et minifié

## 🎨 Design & UX

- **Design moderne** : Interface épurée et professionnelle
- **Palette de couleurs** : Bleu institutionnel et orange vif
- **Typographie** : Polices modernes et lisibles
- **Animations** : Transitions fluides et micro-interactions
- **Accessibilité** : Navigation clavier et lecteurs d'écran

## 🤝 Contribuer

1. Fork le projet
2. Créer une branche (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est la propriété de **Sup Management Intelligentsia**.

## 📞 Contact

- **Développeur** : Ousmane Ly
- **Institution** : Sup Management Intelligentsia
- **Email** : mohamedousanely@gmail.com

---

**SMI PULSE** - *L'excellence pédagogique, évaluée par ceux qui comptent* 🎓✨
