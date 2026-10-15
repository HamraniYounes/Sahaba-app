# Sahaba — checklist de préproduction

## Fonctionnalités incluses dans cette version
- Soumission d'un lieu sans champs de latitude/longitude : géocodage automatique depuis l'adresse, la ville et le pays.
- Upload de 5 photos maximum (JPEG/PNG/WebP, 5 Mo chacune) vers le bucket Supabase `location-photos`.
- Horaires d'ouverture saisis par jour et affichés sur la fiche.
- Modification des coordonnées descriptives par le créateur, le propriétaire associé ou la modération; recalcul géographique automatique. La console de modération fournit un lien direct « Modifier le contenu » pour chaque fiche visible.
- Carte OpenStreetMap intégrée sur la fiche.
- Avis, favoris, réclamations de propriété et réponses des propriétaires vérifiés.
- Console de modération des lieux, signalements, réclamations, avis, profils/rôles, publicités et statistiques.
- Métadonnées SEO canoniques par route, génération du sitemap à partir des fiches publiques, en-têtes de sécurité Netlify et lien de saut clavier.
- Tests automatisés Node pour les garde-fous de configuration et tests SQL pgTAP de structure RLS et d'accès par rôle.
- Fondations RTL CSS et helper de direction du document; seule la langue française est activée tant que les traductions ne sont pas complètes.

## Configuration requise
1. Copier `.env.example` vers `.env.local` et définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (clé publique uniquement).
2. Exécuter `supabase/migrations/001_initial_schema.sql` puis `supabase/migrations/002_storage_and_production.sql` dans l'éditeur SQL Supabase.
3. Créer un compte utilisateur puis attribuer le premier rôle admin depuis le SQL Editor avec l'UUID réel du compte : `update public.profiles set role='admin' where id='UUID';`.
4. Vérifier les règles d'authentification, la confirmation e-mail, les URL de redirection et la configuration SMTP dans Supabase.
5. Héberger en HTTPS. Ne jamais placer une clé `service_role` dans le frontend.

## Tests automatisés
- `npm test` : tests de garde-fous du dépôt (ne remplace pas les tests navigateur/E2E).
- `supabase start`, `supabase db reset`, puis `supabase test db` : tests SQL pgTAP sous `supabase/tests/database/` dans une base locale isolée (Docker requis).
- `npm run lint` et `npm run build` : validation TypeScript, lint et build de production.
- Le build et les tests Supabase nécessitent les dépendances npm et la CLI Supabase installées; les tests SQL doivent être lancés sur une base de test, jamais sur la production.

## Tests de recette obligatoires
- [ ] Inscription, confirmation e-mail, connexion, récupération et réinitialisation du mot de passe.
- [ ] Soumission d'un lieu valide; confirmer `created_by = auth.uid()`, `owner_id IS NULL`, `status = 'pending'` et coordonnées calculées.
- [ ] Adresse inconnue : l'envoi doit être bloqué avec un message compréhensible.
- [ ] Upload autorisé de photos et refus des types/taille non autorisés; vérifier la visibilité du bucket.
- [ ] Validation/rejet d'un lieu; seul un lieu publié/attribué doit être public.
- [ ] Modifier une fiche comme créateur/propriétaire, puis tenter la même action avec un autre compte.
- [ ] Avis, édition d'avis, favoris, signalements, réclamation et réponse d'un propriétaire vérifié.
- [ ] Approuver une réclamation et vérifier le lien propriétaire/lieu; rejeter une réclamation sans modifier le lieu.
- [ ] Modération des avis, gestion des rôles, activation/désactivation/suppression des publicités et statistiques.
- [ ] Tester les politiques RLS en tant qu'anonyme, utilisateur, modérateur et administrateur.
- [ ] Navigation clavier, focus visible, zoom 200 %, contraste, lecteur d'écran et affichage mobile.
- [ ] Tester les erreurs réseau, l'absence de configuration Supabase et les sessions expirées.

## Avant une vraie mise en production
- Installer les dépendances puis exécuter `npm test`, `npm run lint`, `npm run build` et `supabase test db` dans CI.
- Configurer `VITE_SITE_URL` avec le vrai domaine HTTPS canonique, ainsi que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Ne pas utiliser de valeur d'exemple.
- Générer le sitemap après configuration : `npm run sitemap`, puis `npm run build`. Le script ne publie que les lieux `published` et `claimed` accessibles via l'API publique.
- Les en-têtes sont fournis pour Netlify (`netlify.toml` et `public/_headers`). Adapter et vérifier la CSP sur tout autre hébergeur. N’ajouter `includeSubDomains` ou `preload` à HSTS qu’après avoir vérifié que tous les sous-domaines sont exclusivement HTTPS et que le domaine respecte les critères de préchargement.
- Le rendu reste une SPA : le sitemap aide les robots, mais un pré-rendu/SSR reste recommandé pour un SEO robuste et des aperçus sociaux par fiche.
- L'internationalisation n'est pas complète. Seul le français est activé. Le helper RTL et les styles sont des fondations, pas une validation de l'interface arabe. Traduire et vérifier toutes les pages, erreurs, e-mails, publicités et textes légaux; effectuer des tests clavier, mobile, zoom et lecteur d'écran avant d'activer chaque langue.
- Nominatim public : le trafic agrégé d'une application doit rester sous 1 requête/seconde; fournir un Referer ou User-Agent identifiant l'application, afficher l'attribution OpenStreetMap, mettre en cache, éviter tout autocomplete et toute géocodification en masse. Le cache et la temporisation du navigateur ne sont qu'une protection locale, pas une limite globale. Pour un trafic important, déployer un proxy avec cache/limitation globale ou utiliser un fournisseur adapté. Le service doit pouvoir être remplacé sans mise à jour de l'application.
- Mettre en place sauvegardes, surveillance, alertes, politique de conservation, procédure de suppression/export des données et revue RGPD.
