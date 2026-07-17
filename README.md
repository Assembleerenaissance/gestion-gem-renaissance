# Gestion des GEM — Projet de migration (Phase 2)

Assemblée RENAISSANCE — Vases d'Honneur

## Où en est cette Phase 2
h
Ce projet contient :
- ✅ Le **schéma complet de base de données** (`supabase/schema.sql`) — toutes les tables nécessaires à l'application complète (membres, GEM, comptes, santé spirituelle, messages, calendrier, etc.)
- ✅ La **structure du projet React** (Vite + Tailwind), prête à être déployée sur Vercel
- ✅ L'**authentification fonctionnelle** connectée à Supabase (connexion / inscription)
- ✅ Un **tableau de bord de base** (comptage des membres et des GEM)

**Ce qui reste à faire** (prochaines étapes, une fois cette base validée en ligne) :
- Porter les écrans complets : gestion des membres, rapports hebdo/mensuel/annuel, santé spirituelle, messagerie, calendrier, historique, etc.
- C'est un travail volontairement étalé en plusieurs livraisons plutôt que tout d'un coup, pour s'assurer que chaque brique fonctionne avant de construire la suivante.

## Étape 1 — Installer les dépendances

Sur ton ordinateur (ou dans GitHub Codespaces si tu n'as pas d'ordinateur avec Node.js installé) :

```bash
npm install
```

## Étape 2 — Configurer Supabase

1. Copie `.env.example` en `.env` :
   ```bash
   cp .env.example .env
   ```
2. Ouvre `.env` et remplace les deux valeurs par celles de ton projet Supabase (**Project Settings → API**) :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Étape 3 — Créer les tables dans Supabase

1. Va dans ton projet Supabase → **SQL Editor** → **New query**
2. Ouvre le fichier `supabase/schema.sql` de ce projet, copie tout son contenu
3. Colle-le dans l'éditeur SQL de Supabase, puis clique sur **Run**
4. Tu devrais voir "Success" — toutes les tables sont créées, avec les 12 tribus et 28 départements déjà remplis

## Étape 4 — Créer le premier compte pasteur

Comme il n'y a plus de compte pasteur "de démonstration" pré-rempli (contrairement à la version Claude), il faut créer le tien :

1. Lance l'application en local pour tester : `npm run dev`
2. Ouvre l'adresse affichée (généralement `http://localhost:5173`)
3. Clique sur "Inscription", crée ton compte avec ton nom, ton téléphone et un mot de passe
4. Va ensuite dans Supabase → **Table Editor** → table `comptes`
5. Trouve la ligne avec ton nom, et change la colonne `role` de `null` à `pasteur`

## Étape 5 — Déployer sur Vercel

1. Mets ce projet sur GitHub (crée un nouveau dépôt, pousse ces fichiers)
2. Sur [vercel.com](https://vercel.com) → **Add New → Project** → sélectionne ton dépôt GitHub
3. Dans les paramètres du projet Vercel, va dans **Settings → Environment Variables** et ajoute les deux mêmes variables que dans `.env` :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique sur **Deploy**
5. En 1-2 minutes, ton application est en ligne avec une adresse `xxxx.vercel.app`

## Structure du projet

```
gestion-gem/
├── supabase/
│   └── schema.sql          ← à exécuter une seule fois dans Supabase
├── src/
│   ├── App.jsx              ← application (base actuelle)
│   ├── main.jsx              ← point d'entrée React
│   ├── supabaseClient.js     ← connexion à Supabase
│   └── index.css
├── .env.example              ← modèle de configuration
├── package.json
└── vite.config.js
```

## Besoin d'aide à une étape ?

Reviens sur Claude avec le message d'erreur exact ou une description de ce qui bloque — je pourrai te guider précisément.
