# Sahel Signal — frontend

Socle frontend du MVP Sahel Signal, aligné sur l’API Laravel présente dans
`../backend`.

## Stack

- React + TypeScript strict + Vite
- Tailwind CSS
- React Router et TanStack Query
- Axios avec intercepteurs centralisés
- Zod pour valider la configuration
- Dexie/IndexedDB pour les brouillons et la file hors ligne
- PWA avec Workbox
- Vitest, Testing Library, ESLint et Prettier

## Démarrage

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

L’API attendue par défaut est `http://localhost:8000/api`. Le backend doit
autoriser l’origine `http://localhost:5173` dans sa configuration CORS.

## Commandes qualité

```powershell
npm run lint
npm run test
npm run format:check
npm run build
```

## Organisation

```text
src/
├── app/          composition, routes et providers
├── components/   composants partagés et layout
├── config/       variables d’environnement validées
├── features/     écrans et logique par domaine
├── models/       contrats TypeScript alignés sur Laravel
├── offline/      IndexedDB, brouillons et synchronisation
├── security/     session, jeton, permissions et routes protégées
├── services/     accès API et normalisation des erreurs
└── test/         configuration des tests
```

Consulter [ARCHITECTURE.md](./ARCHITECTURE.md) pour les décisions et les limites
de sécurité.

Le pipeline CI, l'image Nginx de staging, les en-têtes de sécurité et la
procédure de rollback sont documentés dans
[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## Synchronisation hors ligne

La file IndexedDB conserve le signalement et ses preuves (photo et position
consentie). L’en-tête `X-Idempotency-Key` permet au backend de rejouer une
tentative interrompue sans créer de doublon. La synchronisation est activée par
défaut :

```dotenv
VITE_ENABLE_OFFLINE_SYNC=true
```

Elle peut être désactivée par environnement en positionnant la variable à
`false`. Les données restent alors dans les brouillons et la file locale jusqu’à
une reprise manuelle ou une nouvelle configuration.
