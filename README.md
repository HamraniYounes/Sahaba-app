# Sahaba — annuaire communautaire

Socle de reconstruction avec React, TypeScript, Vite, Tailwind CSS et Supabase.

## Prérequis
- Node.js 20.19+ ou 22.12+
- Un projet Supabase
- npm

## Installation
```bash
npm install
cp .env.example .env.local
```
Renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans `.env.local`.
Dans Supabase → SQL Editor, exécutez le contenu de `supabase/migrations/001_initial_schema.sql`.
Puis :
```bash
npm run dev
```
Pour vérifier la compilation : `npm run build`.

## Fonctionnalités du socle
- Recherche et filtres sur les lieux publiés, cartes de lieux responsives
- Fiche lieu par slug
- Authentification email/mot de passe via Supabase
- Proposition de lieu avec géolocalisation navigateur facultative
- Favoris, avis et signalements
- Profil et routes d'administration protégées par rôle
- Schéma SQL avec contraintes, triggers et politiques RLS
- Page admin initiale de modération

## Sécurité et configuration
- N'exposez jamais une clé `service_role` dans le navigateur. Seule la clé anon/publishable est destinée au client.
- Les rôles et autorisations doivent être contrôlés côté base de données, pas uniquement dans le frontend.
- Configurez les URL de redirection Auth dans Supabase.
- Pour la production, ajoutez les procédures de suppression de compte, anti-spam/rate limiting, politique de confidentialité, CGU, sauvegardes et supervision.
- L'envoi d'e-mails administratifs doit passer par une Edge Function ou un serveur de confiance, jamais par une clé privilégiée côté navigateur.
- Le géocodage Nominatim public est soumis à une politique d'utilisation : ne l'utilisez pas pour du géocodage massif sans fournisseur adapté.

## Structure
```text
src/
  components/     composants d'interface réutilisables
  contexts/       session utilisateur
  lib/            client Supabase et utilitaires
  pages/          routes de l'application
  types/          types métier
supabase/
  migrations/     schéma, contraintes et politiques RLS
```

## Suite recommandée
1. Configurer Supabase Auth (email, Google OAuth et confirmation e-mail).
2. Créer un bucket Storage `location-images` et appliquer des politiques Storage adaptées.
3. Ajouter les tests et le pipeline de déploiement.
4. Ajouter Leaflet, l'import CSV et le géocodage batch contrôlé.
5. Implémenter les workflows avancés de transfert de propriété et la gestion des sessions de modération.

## Stabilisation du socle (authentification + RLS)

### URL de redirection Supabase
Dans **Authentication → URL Configuration**, configurez :
- Site URL : `http://localhost:5173` en développement (remplacez-la par le domaine de production lors du déploiement).
- Redirect URLs : `http://localhost:5173/**` et votre domaine de production, par exemple `https://sahaba.example/**`.

### Authentification implémentée
- Inscription e-mail/mot de passe, avec confirmation e-mail si elle est activée dans Supabase.
- Connexion et restauration de session persistante.
- Déconnexion via le contexte d'authentification.
- Demande de réinitialisation et formulaire de nouveau mot de passe.
- L'interface signale une configuration Supabase absente plutôt que de tenter une authentification normale.

### Appliquer les protections SQL
Si la migration initiale n'a pas encore été exécutée, exécutez `supabase/migrations/001_initial_schema.sql` dans le SQL Editor. Si elle a déjà été appliquée à un projet de test, les protections de cette version doivent aussi être appliquées : récupérez les définitions `protect_location_creator` et la version mise à jour de `protect_profile_role`, puis remplacez la policy `profiles public read basic` par `users read own profile and moderators read profiles` depuis le fichier SQL. Ne recréez pas les policies existantes sans les supprimer ou les remplacer. Ne relancez pas toute la migration initiale sur une base déjà créée : les instructions `CREATE TYPE` et `CREATE TABLE` ne sont pas toutes idempotentes.

Les triggers renforcent les politiques RLS : un utilisateur ne peut pas s'attribuer un rôle ou un badge de contribution, modifier le statut de publication, transférer un lieu à un autre propriétaire ou réécrire son créateur d'origine. Les rôles sont stockés en base et doivent être accordés manuellement à des comptes de confiance depuis le SQL Editor. Après avoir créé le compte, vérifiez son UUID dans **Authentication → Users**, puis exécutez (en remplaçant l'UUID) :

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-DU-COMPTE-ADMIN';
```

Ne créez jamais de bouton frontend permettant à un utilisateur de s'accorder lui-même un rôle privilégié.

### Validation locale
Depuis le dossier du projet :

```bash
npm install
npm run build
npm run lint
npm run dev
```

La compilation n'a pas pu être exécutée dans l'environnement de génération, car le registre npm n'était pas accessible et les dépendances n'étaient pas disponibles en cache. Exécutez `npm run build` dans votre environnement local après `npm install` ; corrigez les éventuelles erreurs résiduelles avant de déployer.

## Fonctions ajoutées — lieux, communauté et administration

- Le formulaire de proposition ne demande pas de latitude/longitude. Les coordonnées sont calculées depuis l'adresse, la ville et le pays lors de l'envoi.
- Photos, horaires par jour, page de modification et carte OpenStreetMap intégrée.
- Réponses des propriétaires vérifiés, réclamations de fiches, modération des avis, gestion des rôles, publicités et statistiques.
- Exécuter également `supabase/migrations/002_storage_and_production.sql` pour créer le bucket de photos et ses règles Storage.
- Consulter `docs/PRODUCTION_CHECKLIST.md` avant tout déploiement.

La compilation n'a pas pu être confirmée dans l'environnement de génération car les dépendances npm n'ont pas pu être installées. Exécuter `npm install`, `npm run lint` et `npm run build` dans un environnement disposant d'un accès au registre npm avant le déploiement.


## Tests et préparation production

- `npm test` : tests automatisés de garde-fous.
- `npm run lint` et `npm run build` : vérification du code.
- `supabase start`, `supabase db reset`, puis `supabase test db` : tests pgTAP sous `supabase/tests/database` (Docker requis, base locale isolée).
- `VITE_SITE_URL` doit être le domaine canonique réel. Puis `npm run sitemap` et `npm run build` pour produire `public/sitemap.xml`.
- Netlify : les en-têtes sont définis dans `netlify.toml`; adaptez la CSP pour tout autre hébergeur.
- Seul le français est activé. Les styles RTL ne signifient pas que la traduction arabe est terminée.
- La protection Nominatim côté navigateur est locale seulement; un proxy/cache à limitation globale est requis avant une montée en charge.
