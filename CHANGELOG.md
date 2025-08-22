# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

## [Non publié]

### À venir
    - Nouvelles fonctionnalités en développement

## [v1.4] - 2025-08-22

### Ajouté
    - Journalisation des versions (CHANGELOG)
    - Infrastructure de monitoring avec Uptime Kuma
    - Docker Compose pour monitoring isolé

## [v1.3] - 2025-08-22

### Modifié
    - Mise à jour majeure de la documentation README.md
    - Amélioration des instructions d'installation
    - Ajout des guides de déploiement
    - Documentation

### Corrigé
    - Nettoyage de la documentation obsolète
    - Optimisation de la taille du fichier README

## [v1.2] - 2025-08-22

### Modifié
    - Refactorisation complète de la documentation README.md
    - Restructuration de l'architecture documentaire
    - Optimisation de la lisibilité
    - Réduction significative de la taille du fichier

## [v1.1] - 2025-08-21

### Corrigé
    - Correction de la pipeline CI/CD
    - Correction du workflow GitHub Actions
    - Amélioration de la fiabilité des tests

### Technique
    - Optimisation du processus de build automatique

## [v1.0] - 2025-08-21

### Ajouté
    - **API Complète de Gestion des Massages**
    - Authentification JWT sécurisée
    - Gestion des utilisateurs avec rôles (Admin/Client)
    - Module de gestion des massages avec images optionnelles
    - Système de planning et réservations
    - Module de notifications email

**Documentation API**
    - Intégration Swagger pour documentation interactive
    - Endpoints documentés avec exemples
    - Schémas de validation des données

**Infrastructure Technique**
    - Base de données Prisma avec MySQL
    - Architecture NestJS modulaire
    - Tests unitaires et end-to-end complets
    - Système de logs structurés avec Winston

**CI/CD Automatisée**
    - Pipeline GitHub Actions complète
    - Tests automatisés (unit + e2e + linting)
    - Build et publication Docker automatique
    - Versioning automatique avec tags Git

**Sécurité**
    - Authentification par tokens JWT
    - Validation des données d'entrée
    - Protection CORS configurée
    - Gestion des rôles et permissions

**Fonctionnalités Métier**
    - Gestion des créneaux horaires (Admin)
    - Réservation de massages (Utilisateurs)
    - Gestion des profils utilisateurs
    - Système de notifications email
    - Upload d'images pour les massages

### Technique
**Stack Complète**
    - Backend: NestJS + TypeScript
    - Base de données: MySQL avec Prisma ORM
    - Conteneurisation: Docker + Docker Compose
    - Tests: Jest (unit + integration + e2e)
    - Documentation: Swagger/OpenAPI

**DevOps**
    - GitHub Actions pour CI/CD
    - Publication automatique sur GitHub Container Registry
    - Versioning sémantique automatique
    - Environnements de test isolés

### Corrigé
    - Nettoyage des fichiers d'initialisation obsolètes
    - Correction des problèmes de routage Swagger
    - Optimisation du Dockerfile
    - Résolution des erreurs de linting
    - Correction des tests de planning
    - Fix des problèmes Docker Compose

---

## Légende des Types de Modifications

**Ajouté** : Nouvelles fonctionnalités
**Modifié** : Changements dans les fonctionnalités existantes
**Déprécié** : Fonctionnalités qui seront supprimées prochainement
**Supprimé** : Fonctionnalités supprimées
**Corrigé** : Corrections de bugs
**Sécurité** : Corrections de vulnérabilités
**Technique** : Améliorations techniques sans impact fonctionnel

---

## Notes de Version

### v1.4 - Version Monitoring & Documentation
Ajout de l'infrastructure de monitoring avec Uptime Kuma et mise en place du changelog pour le suivi des versions.

### v1.3 - Version de Documentation
Focus sur l'amélioration de la documentation utilisateur et développeur.

### v1.2 - Optimisation Documentation  
Refactorisation majeure de la documentation pour une meilleure lisibilité + test ci/cd et build de l'image.

### v1.1 - Stabilisation CI/CD
Corrections critiques de la pipeline de déploiement automatique.

### v1.0 - Version Initiale
Première version de production avec toutes les fonctionnalités core de l'API de gestion des massages. Cette version inclut l'ensemble des modules métier, l'infrastructure technique complète et la pipeline CI/CD automatisée.

---
