# Architecture frontend

## Principes

Le frontend suit une organisation par fonctionnalité. Les pages orchestrent
l’affichage, les services possèdent les appels HTTP, les modèles décrivent le
contrat Laravel et la sécurité transversale reste dans `src/security`.

```text
Page → service métier → client HTTP → API Laravel
  │          │              │
  │          │              ├── Authorization: Bearer
  │          │              ├── X-Request-ID
  │          │              └── erreurs Laravel normalisées
  │          └── contrats TypeScript
  └── TanStack Query (cache serveur)

Formulaire → OfflineDraft → SyncQueueItem → SyncService → ReportService
```

## Contrats couverts

Les modèles et services couvrent les 16 routes actuelles : authentification,
catégories, territoires, signalements, affectations, notifications et tableau
de bord. Les statuts et rôles reprennent exactement les enums Laravel.

Les données serveur restent dans TanStack Query. Les brouillons locaux et la
file d’envoi vivent dans IndexedDB. La photo compressée et la position précise
consentie suivent le signalement dans ces deux stockages jusqu’à l’envoi.
Aucun jeton JWT n’est écrit dans IndexedDB.

## Sécurité

- Le jeton actuel est conservé dans `sessionStorage`, car l’API renvoie un JWT
  dans le corps JSON. Il est supprimé sur déconnexion et sur réponse `401`.
- Le stockage en session réduit la persistance mais ne protège pas d’une XSS.
  La cible production recommandée est un cookie `HttpOnly`, `Secure`,
  `SameSite` émis par le backend.
- Les rôles côté React servent uniquement à l’UX. Les policies Laravel restent
  la frontière d’autorisation réelle.
- La configuration refuse une URL API HTTP hors `localhost`.
- Chaque requête reçoit un `X-Request-ID`. Le backend doit le propager dans les
  logs et la réponse.
- Le service worker ne met pas en cache les réponses authentifiées. Seuls les
  référentiels publics utilisent une stratégie `NetworkFirst`.
- Le code n’utilise pas d’injection HTML. Les messages serveur sont rendus comme
  texte.

En production, servir l’application sous HTTPS et ajouter au reverse proxy au
minimum : `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
et une `Permissions-Policy` restrictive. La CSP doit autoriser uniquement le
domaine réel de l’API dans `connect-src`.

## Hors ligne et idempotence

Un `clientSubmissionId` est généré côté navigateur et transmis par
`X-Idempotency-Key`. Le backend persiste cette clé avec une contrainte unique et
rejoue la première réponse lors des répétitions. Son empreinte canonique couvre
les champs et le contenu des fichiers sans dépendre de la boundary multipart.
Les exemples d’environnement activent donc `VITE_ENABLE_OFFLINE_SYNC`.

Les erreurs `4xx` bloquent l’élément de file afin qu’un humain corrige le
brouillon. Les erreurs réseau, `429` et `5xx` utilisent une temporisation
exponentielle plafonnée à quinze minutes.

## Découpage futur

Les modules `assignments`, `notifications` et administration disposent déjà de
leurs modèles/services. Leurs écrans peuvent être ajoutés sous `src/features`
sans modifier le client HTTP. La consultation cartographique et le suivi public
attendent encore leurs écrans et endpoints dédiés.
