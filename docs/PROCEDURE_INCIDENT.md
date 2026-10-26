# Procédure d'incident — Sahaba

**Statut : brouillon opérationnel à valider avant ouverture publique**

## 1. Principes

En cas d'incident, priorité à :

1. protéger les utilisateurs ;
2. contenir l'incident ;
3. préserver les preuves ;
4. restaurer le service ;
5. déterminer l'origine ;
6. documenter les actions ;
7. notifier les personnes ou autorités lorsque la réglementation l'exige.

Ne jamais supprimer ou réécrire des preuves uniquement pour faire disparaître une alerte.

## 2. Classification

### P0 — critique

Exemples :

- accès non autorisé massif ;
- fuite de données personnelles ;
- compromission d'un compte administrateur ;
- clé secrète exposée ;
- corruption importante de la base ;
- indisponibilité totale durable.

**Action : immédiate, responsable technique mobilisé.**

### P1 — majeur

Exemples :

- authentification indisponible ;
- géocodage global indisponible ;
- erreurs massives sur création de lieux ;
- panne Storage ;
- régression de sécurité limitée.

### P2 — modéré

Exemples :

- fonctionnalité secondaire dégradée ;
- erreurs limitées ;
- problème d'affichage non bloquant.

### P3 — faible

Problèmes cosmétiques ou améliorations sans impact significatif.

## 3. Première réponse — 15 minutes

- [ ] confirmer l'alerte ;
- [ ] noter l'heure ;
- [ ] identifier le périmètre ;
- [ ] vérifier les changements récents ;
- [ ] vérifier GitHub Actions ;
- [ ] vérifier Netlify ;
- [ ] vérifier Supabase ;
- [ ] vérifier les erreurs frontend/Edge Functions ;
- [ ] déterminer si des données personnelles sont concernées.

## 4. Containment

Selon le cas :

- désactiver temporairement une fonctionnalité ;
- suspendre un compte compromis ;
- révoquer une clé exposée ;
- désactiver un déploiement ;
- restaurer une version connue comme saine ;
- limiter une API ou un endpoint ;
- bloquer temporairement les contributions.

**Ne jamais mettre une clé `service_role` dans le frontend pour contourner un problème.**

## 5. Compromission d'un secret

Si une clé ou un token est exposé :

1. considérer le secret comme compromis ;
2. le révoquer/faire tourner immédiatement chez le fournisseur ;
3. rechercher son utilisation dans les logs disponibles ;
4. vérifier les commits et artefacts ;
5. remplacer la configuration ;
6. redéployer ;
7. documenter l'incident.

## 6. Incident de données personnelles

Si une violation de données personnelles est suspectée :

- limiter immédiatement l'accès ;
- identifier les catégories de données concernées ;
- identifier les personnes potentiellement concernées ;
- déterminer la période d'exposition ;
- conserver les éléments techniques utiles ;
- documenter l'analyse et les mesures prises ;
- consulter sans délai le responsable juridique/DPO.

**La notification éventuelle à une autorité ou aux personnes concernées dépend de l'analyse juridique et des délais prévus par la réglementation applicable.**

## 7. Restauration

- [ ] identifier la dernière version saine ;
- [ ] identifier la dernière sauvegarde saine ;
- [ ] choisir rollback ou restauration ;
- [ ] tester la restauration dans un environnement séparé lorsque possible ;
- [ ] vérifier RLS, fonctions, Storage et données critiques ;
- [ ] remettre en service progressivement ;
- [ ] surveiller après restauration.

## 8. Communication

### Interne

Message minimal :

- quoi ;
- depuis quand ;
- impact ;
- action en cours ;
- responsable ;
- prochaine mise à jour.

### Externe

Ne publier que les informations nécessaires, sans révéler de données personnelles, secrets techniques ou détails facilitant une exploitation.

Canal public : **[URL / PAGE STATUS]**

Contact : **[EMAIL]**

## 9. Post-mortem

Dans les 48 à 72 heures après résolution :

- cause racine ;
- cause contributive ;
- impact ;
- durée ;
- détection ;
- containment ;
- restauration ;
- ce qui a bien fonctionné ;
- ce qui a échoué ;
- actions correctives ;
- responsable et échéance de chaque action.

Le post-mortem doit être factuel et orienté amélioration, sans recherche de faute individuelle.

## 10. Fiche d'incident

**ID :** [INC-AAAA-MM-JJ-XXX]  
**Date :** [DATE]  
**Niveau :** [P0/P1/P2/P3]  
**Détecté par :** [NOM / MONITORING]  
**Responsable :** [NOM]

### Résumé

[DESCRIPTION]

### Impact

[IMPACT]

### Chronologie

- [HEURE] — [ÉVÉNEMENT]
- [HEURE] — [ACTION]
- [HEURE] — [RÉSULTAT]

### Mesures de confinement

[ACTIONS]

### Restauration

[ACTIONS]

### Données personnelles concernées

[OUI/NON + ANALYSE]

### Communication

[DESTINATAIRES / DATES]

### Cause racine

[CAUSE]

### Actions correctives

- [ ] [ACTION] — responsable [NOM] — échéance [DATE]
