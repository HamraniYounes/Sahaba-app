# Sahaba — exploitation, sauvegardes et supervision

Ce document complète la checklist de préproduction. Il décrit ce qui doit être configuré dans les services externes avant l'ouverture publique.

## 1. Sauvegardes Supabase

- Activer et vérifier les sauvegardes automatiques du projet Supabase selon le plan utilisé.
- Conserver une copie indépendante des données critiques lorsque le niveau de disponibilité l'exige.
- Tester une restauration sur un projet de staging au moins une fois par trimestre.
- Documenter le dernier test de restauration : date, responsable, durée et résultat.
- Ne jamais stocker une clé `service_role` dans GitHub Actions, le navigateur ou les logs.

## 2. Supervision applicative

Le dépôt contient un workflow GitHub Actions `Production monitoring` exécuté toutes les 15 minutes.

Configurer le secret de dépôt :

`PRODUCTION_URL=https://votre-domaine.example`

Le workflow vérifie :

- la disponibilité de la page d'accueil ;
- la disponibilité du `sitemap.xml` ;
- les erreurs HTTP et les délais de réponse via `curl` avec deux tentatives.

Sans `PRODUCTION_URL`, le job est volontairement ignoré afin de ne pas créer de faux positifs avant le déploiement.

## 3. Alertes

Configurer les notifications GitHub Actions pour les échecs du workflow de supervision. Pour une production critique, compléter avec un service d'uptime externe et une alerte distincte du fournisseur d'hébergement.

Objectifs recommandés :

- disponibilité cible : >= 99,9 % ;
- alerte après deux contrôles consécutifs en échec ;
- escalade humaine pour une panne prolongée ;
- vérification manuelle du statut Supabase lors d'un incident applicatif.

## 4. Conservation et RGPD

Avant production, fixer par écrit :

- les durées de conservation des comptes, contributions, avis, signalements et journaux techniques ;
- les critères d'anonymisation ou de suppression ;
- les personnes habilitées à accéder aux données de modération ;
- la procédure de demande d'accès, d'export, de rectification et de suppression ;
- la procédure de gestion d'une violation de données.

L'application fournit déjà l'export personnel et la suppression de compte ; la politique publiée doit rester cohérente avec ces mécanismes.

## 5. Incident et restauration

En cas d'incident :

1. confirmer l'étendue du problème sans exposer de données personnelles dans les tickets ;
2. vérifier GitHub Actions, Netlify et Supabase ;
3. identifier le dernier déploiement sain ;
4. restaurer depuis une sauvegarde uniquement après avoir déterminé le risque de perte de données ;
5. documenter la cause, l'impact et les actions correctives ;
6. tester les parcours critiques après restauration : connexion, lecture publique, création/modération et export/suppression de compte.

## 6. Mise en production

Avant de déclarer la production prête, valider la checklist `docs/PRODUCTION_CHECKLIST.md` et effectuer un test de restauration réel sur un environnement de staging.
