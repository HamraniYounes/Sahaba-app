# Recette de production — Sahaba

**Statut : plan de recette à exécuter avant ouverture publique**

## 1. Préparation

- [ ] Déployer sur une URL de préproduction HTTPS.
- [ ] Utiliser un projet Supabase de préproduction distinct de la production.
- [ ] Vérifier `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `VITE_SITE_URL`.
- [ ] Déployer la fonction `geocode` avec JWT obligatoire.
- [ ] Configurer SMTP de test.
- [ ] Créer les comptes de test : utilisateur, propriétaire, modérateur, administrateur.
- [ ] Vérifier que les secrets E2E dédiés ne sont pas des comptes personnels.

## 2. Matrice des comptes

| Compte | Usage |
|---|---|
| USER_A | parcours utilisateur standard |
| USER_B | contrôle des permissions |
| OWNER_A | gestion d'une fiche revendiquée |
| MOD_A | modération |
| ADMIN_A | administration |

Les mots de passe de recette doivent être uniques et ne jamais être réutilisés en production personnelle.

## 3. Authentification

- [ ] Inscription USER_A.
- [ ] Vérifier réception du mail de confirmation.
- [ ] Confirmer l'adresse.
- [ ] Se connecter.
- [ ] Se déconnecter.
- [ ] Se reconnecter.
- [ ] Demander un reset password.
- [ ] Utiliser le lien reçu.
- [ ] Vérifier qu'une session expirée est correctement gérée.
- [ ] Vérifier qu'un utilisateur non authentifié ne peut pas accéder à `/submit`, `/favorites`, `/profile` ou aux routes d'administration.

## 4. Création de lieu

- [ ] USER_A crée un lieu valide.
- [ ] Vérifier `created_by = USER_A`.
- [ ] Vérifier `owner_id IS NULL`.
- [ ] Vérifier `status = pending`.
- [ ] Vérifier le calcul des coordonnées.
- [ ] Vérifier le fuseau horaire.
- [ ] Vérifier les horaires.
- [ ] Vérifier une adresse inconnue : l'envoi est bloqué proprement.
- [ ] Vérifier les validations de longueur, email, URL, coordonnées et catégories.

## 5. Photos

- [ ] Envoyer JPEG autorisé.
- [ ] Envoyer PNG autorisé.
- [ ] Envoyer WebP autorisé.
- [ ] Refuser une extension/type non autorisé.
- [ ] Refuser un fichier de plus de 5 Mo.
- [ ] Vérifier qu'un utilisateur ne peut pas écrire dans le dossier d'un autre utilisateur.
- [ ] Vérifier l'affichage public d'une photo autorisée.
- [ ] Vérifier la suppression d'une photo autorisée.

## 6. Modération

- [ ] MOD_A voit le lieu pending.
- [ ] MOD_A publie le lieu.
- [ ] Vérifier que le lieu publié est visible publiquement.
- [ ] Rejeter un autre lieu.
- [ ] Vérifier qu'un lieu rejeté n'est pas exposé dans l'annuaire public.
- [ ] Vérifier qu'un utilisateur standard ne peut pas modifier l'état de modération.

## 7. Propriété / claims

- [ ] OWNER_A soumet une réclamation.
- [ ] Vérifier que la réclamation est pending.
- [ ] ADMIN_A approuve.
- [ ] Vérifier `owner_id`.
- [ ] Vérifier le rôle propriétaire si applicable.
- [ ] OWNER_A modifie la fiche.
- [ ] USER_B tente la même modification et est refusé.
- [ ] Tester un rejet de réclamation.

## 8. Transfert de propriété

- [ ] OWNER_A demande un transfert vers USER_B.
- [ ] USER_B voit le transfert entrant.
- [ ] USER_B accepte.
- [ ] Vérifier le nouveau `owner_id`.
- [ ] Vérifier que l'ancien propriétaire n'a plus les droits d'édition fondés sur la propriété.
- [ ] Tester un refus.
- [ ] Tester une annulation par le propriétaire.
- [ ] Tester une tentative d'acceptation d'un transfert devenu obsolète.

## 9. Avis, favoris et signalements

- [ ] USER_A publie un avis.
- [ ] USER_A modifie son avis.
- [ ] USER_B ne peut pas modifier l'avis de USER_A.
- [ ] Ajouter/supprimer un favori.
- [ ] Signaler un lieu ou un avis.
- [ ] MOD_A traite le signalement.
- [ ] Vérifier qu'un utilisateur non autorisé ne peut pas accéder aux données de modération.

## 10. Horaires et fermetures

- [ ] Définir plusieurs créneaux pour une même journée.
- [ ] Vérifier l'affichage.
- [ ] Ajouter une fermeture temporaire.
- [ ] Ajouter une fermeture permanente.
- [ ] Vérifier l'état ouvert/fermé selon le fuseau du lieu.
- [ ] Vérifier qu'un utilisateur non autorisé ne peut pas modifier les horaires d'un lieu tiers.

## 11. Administration

- [ ] ADMIN_A accède à `/admin`.
- [ ] MOD_A accède aux fonctions autorisées.
- [ ] USER_A est refusé.
- [ ] Tester gestion des profils/rôles.
- [ ] Tester signalements.
- [ ] Tester réclamations.
- [ ] Tester publicités.
- [ ] Tester statistiques.
- [ ] Tester sessions de modération.
- [ ] Tester import CSV : aperçu, validation, doublons, import par lots, journal.

## 12. RGPD utilisateur

- [ ] USER_A exporte ses données.
- [ ] Vérifier que l'export ne contient pas les données privées d'un autre utilisateur.
- [ ] USER_A demande la suppression.
- [ ] Vérifier les garde-fous avant suppression.
- [ ] Vérifier les cascades et données résiduelles autorisées.
- [ ] Vérifier qu'un compte administrateur protégé ne peut pas être supprimé par le même mécanisme.

## 13. Sécurité et RLS

Pour chaque opération sensible, tester au minimum :

- [ ] anonyme ;
- [ ] USER_A ;
- [ ] USER_B ;
- [ ] OWNER_A ;
- [ ] MOD_A ;
- [ ] ADMIN_A.

Vérifier particulièrement :

- [ ] aucune clé `service_role` côté navigateur ;
- [ ] fonctions sensibles non exécutables par `anon` ;
- [ ] tables protégées non directement accessibles sans RLS ;
- [ ] aucune élévation de rôle possible côté client ;
- [ ] aucun accès aux données d'un autre compte.

## 14. Géocodage

- [ ] Utilisateur authentifié : géocodage réussi.
- [ ] Utilisateur non authentifié : refus.
- [ ] Vérifier le cache.
- [ ] Vérifier la limite locale.
- [ ] Vérifier la limite globale.
- [ ] Vérifier qu'un appel direct à Nominatim n'est plus effectué par le navigateur.
- [ ] Vérifier l'User-Agent.
- [ ] Vérifier les erreurs 4xx/5xx.

## 15. Accessibilité

- [ ] Navigation clavier complète.
- [ ] Focus visible.
- [ ] Zoom 200 %.
- [ ] Contraste.
- [ ] Labels des champs.
- [ ] Messages d'erreur compréhensibles.
- [ ] Lecteur d'écran sur les parcours principaux.
- [ ] Mobile petit écran.

## 16. SEO et partage

- [ ] Titre et description.
- [ ] Canonical.
- [ ] `robots.txt`.
- [ ] `sitemap.xml`.
- [ ] URL d'une fiche publique.
- [ ] Redirection des routes SPA.
- [ ] Aperçu social à vérifier après ajout de l'image Open Graph définitive.

## 17. Résilience

- [ ] Couper temporairement Supabase : interface compréhensible.
- [ ] Expirer une session.
- [ ] Tester erreur réseau.
- [ ] Tester timeout géocodage.
- [ ] Tester upload interrompu.
- [ ] Tester formulaire avec données invalides.
- [ ] Vérifier absence de données sensibles dans les messages d'erreur.

## 18. Go / No-Go

**GO uniquement si :**

- [ ] zéro anomalie critique ou haute non acceptée ;
- [ ] CI verte ;
- [ ] tests Supabase verts ;
- [ ] Security verte ;
- [ ] recette authentifiée terminée ;
- [ ] documents légaux validés ;
- [ ] domaine et HTTPS validés ;
- [ ] SMTP validé ;
- [ ] sauvegardes validées ;
- [ ] monitoring actif ;
- [ ] procédure d'incident connue par au moins une personne responsable.

Date de recette : **[DATE]**  
Version / commit : **[SHA]**  
Responsable : **[NOM]**  
Décision : **[GO / NO-GO]**
