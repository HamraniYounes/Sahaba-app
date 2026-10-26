# Backups, monitoring et continuité — Sahaba

**Statut : brouillon opérationnel à finaliser avec les paramètres du projet de production**

## 1. Objectifs

- pouvoir restaurer les données après une erreur humaine, une panne ou un incident de sécurité ;
- détecter rapidement une indisponibilité ;
- disposer d'un responsable et d'un canal d'escalade ;
- conserver les preuves nécessaires à l'analyse d'un incident ;
- limiter le temps d'indisponibilité et la perte de données.

## 2. Sauvegardes Supabase

### À configurer avant ouverture

- [ ] Vérifier le plan Supabase et les sauvegardes disponibles.
- [ ] Vérifier la fréquence des sauvegardes automatiques.
- [ ] Vérifier la durée de rétention.
- [ ] Vérifier la procédure de restauration disponible pour le plan utilisé.
- [ ] Documenter le dernier backup connu.
- [ ] Définir un responsable de restauration.

### Données critiques

- profils et rôles ;
- lieux ;
- avis ;
- favoris ;
- réclamations ;
- transferts de propriété ;
- signalements ;
- sessions de modération ;
- publicités ;
- métadonnées nécessaires aux droits des utilisateurs.

Les fichiers du bucket `location-photos` doivent faire l'objet d'une stratégie de sauvegarde ou de récupération indépendante si la capacité native utilisée ne couvre pas ce besoin.

## 3. Test de restauration

Au minimum avant le lancement, puis périodiquement :

1. identifier une sauvegarde disponible ;
2. restaurer dans un environnement séparé si le fournisseur le permet ;
3. vérifier le schéma et les migrations ;
4. vérifier quelques profils, lieux, avis et relations ;
5. vérifier les objets Storage critiques ;
6. vérifier que les RLS et fonctions attendues sont présentes ;
7. consigner la durée et les anomalies.

**Ne jamais effectuer un test destructif directement sur la production.**

## 4. Monitoring actuel

Le workflow GitHub `production-monitoring.yml` effectue périodiquement un contrôle HTTP de :

- `/`
- `/sitemap.xml`

Le secret `PRODUCTION_URL` doit être configuré. Si le secret est absent, le workflow se termine volontairement sans test : cette configuration doit donc être contrôlée avant le lancement.

## 5. Monitoring recommandé pour le lancement

Minimum :

- disponibilité du site ;
- disponibilité de `sitemap.xml` ;
- erreurs Supabase ;
- erreurs de fonction `geocode` ;
- saturation ou erreurs Storage ;
- échecs d'authentification anormaux ;
- alertes de sécurité GitHub ;
- espace/quota du projet Supabase ;
- expiration ou problème de domaine/HTTPS.

Ajouter un outil de suivi d'erreurs frontend (par exemple Sentry ou équivalent) si le niveau de trafic le justifie.

## 6. Seuils initiaux

À adapter au trafic réel :

| Signal | Seuil d'alerte initial |
|---|---|
| Site indisponible | 2 checks consécutifs |
| HTTP 5xx | toute augmentation durable |
| Geocode | taux d'erreur > 5 % sur 15 min |
| Auth | hausse inhabituelle d'échecs |
| Storage | erreurs répétées ou quota proche |
| DB | saturation/quota selon métriques Supabase |
| Sécurité | toute alerte critique |

## 7. Astreinte et responsabilités

- Responsable technique : **[NOM]**
- Backup responsable : **[NOM]**
- Canal d'alerte : **[EMAIL / TELEGRAM / SLACK / AUTRE]**
- Fournisseur hébergement : Netlify
- Fournisseur base/auth : Supabase
- Domaine/DNS : **[FOURNISSEUR]**

## 8. RTO / RPO

Valeurs initiales à valider :

- **RTO cible : 4 heures** pour un incident majeur.
- **RPO cible : 24 heures maximum** pour les données persistantes, ou mieux si le plan de sauvegarde le permet.

Adapter ces objectifs à la criticité et au plan Supabase réellement souscrit.

## 9. Journal d'exploitation

Conserver un journal des événements importants :

- date/heure ;
- incident ou changement ;
- responsable ;
- impact ;
- action ;
- résultat ;
- commit/version ;
- décision de suivi.

Ne jamais consigner de mots de passe, tokens, clés privées ou secrets dans ce journal.
