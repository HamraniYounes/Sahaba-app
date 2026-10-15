# E2E authentifiés

Le parcours E2E authentifié utilise deux comptes Supabase dédiés et ne stocke aucun identifiant dans le dépôt.

## Comptes de test

Créer dans le projet Supabase utilisé par la CI :

- `E2E_TEST_USER_EMAIL` : compte utilisateur standard dédié aux tests.
- `E2E_TEST_ADMIN_EMAIL` : compte administrateur dédié aux tests de modération.

Le compte administrateur doit avoir un profil `profiles.role = 'admin'`. Les deux comptes doivent être réservés à l’automatisation et ne pas être utilisés par des personnes.

Pour éviter les interactions avec les données de production, utiliser un projet Supabase de test/staging séparé lorsque c’est possible.

## Secrets GitHub

Ajouter ces secrets au dépôt GitHub :

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_TEST_USER_EMAIL`
- `E2E_TEST_USER_PASSWORD`
- `E2E_TEST_ADMIN_EMAIL`
- `E2E_TEST_ADMIN_PASSWORD`

La clé Supabase utilisée par le navigateur doit être la clé `anon`/publishable, jamais une `service_role`/secret key.

La CI injecte les variables Supabase au moment du build, puis injecte les identifiants uniquement dans l'étape E2E authentifiée.

## Parcours couvert

`e2e/authenticated-flow.spec.mjs` exécute le scénario suivant :

1. connexion avec le compte utilisateur de test ;
2. création d'un lieu avec un nom unique ;
3. vérification que la proposition arrive en attente de modération ;
4. connexion dans un second contexte navigateur avec le compte administrateur ;
5. publication du lieu depuis `/admin` ;
6. retour au contexte utilisateur sur la fiche publiée ;
7. ajout aux favoris ;
8. publication d'un avis ;
9. vérification de l'avis affiché.

Le test utilise deux contextes Playwright séparés afin de vérifier réellement la séparation entre utilisateur et administrateur.

## Nettoyage

Le scénario crée volontairement un lieu unique par exécution. Les données de test doivent donc être conservées dans le projet Supabase de staging et nettoyées périodiquement si nécessaire. Ne pas exécuter ce parcours contre une base de production.
