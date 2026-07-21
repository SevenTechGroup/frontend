# Déploiement du frontend PWA

## Contrôles CI

Le workflow `.github/workflows/frontend.yml` s'exécute sur chaque pull request
et chaque push vers `main`. Il bloque la livraison si l'une de ces commandes
échoue :

```bash
npm run format:check
npm run lint
npm run test
npm run build
```

Le dossier `dist` est conservé comme artefact GitHub pendant 14 jours.

## Environnements

| Environnement | Configuration             | Règle                     |
| ------------- | ------------------------- | ------------------------- |
| Développement | `.env.development`        | API locale HTTP autorisée |
| Staging       | `.env.staging.example`    | HTTPS obligatoire         |
| Production    | `.env.production.example` | HTTPS obligatoire         |

Les fichiers contenant de vrais domaines ou secrets restent hors Git. Seules
les variables préfixées par `VITE_` sont intégrées au bundle : elles ne doivent
jamais contenir de secret.

La synchronisation hors ligne est activée dans les exemples d'environnement.
L'API garantit l'idempotence de `X-Idempotency-Key`, y compris pour les
formulaires multipart contenant une photo et une position consentie. Positionner
`VITE_ENABLE_OFFLINE_SYNC=false` permet de suspendre les envois automatiques
sans supprimer les brouillons locaux.

## Construire l'image staging

Dans GitHub, ouvrir **Actions → Frontend CI and staging image → Run workflow**,
puis renseigner :

- `api_url` : URL complète, par exemple `https://api-staging.example.org/api` ;
- `api_origin` : origine CSP sans chemin, par exemple
  `https://api-staging.example.org`.

Le workflow vérifie la qualité, puis publie deux tags dans GHCR :

- `staging`, pratique mais mutable ;
- `staging-<commit_sha>`, immuable et obligatoire pour un déploiement traçable.

## Déployer sur le serveur staging

Le conteneur écoute sur `127.0.0.1:8080`. Le reverse proxy TLS public doit
relayer vers ce port.

```powershell
$env:FRONTEND_IMAGE_TAG = 'staging-<commit_sha>'
docker compose -f deploy/compose.staging.yml pull
docker compose -f deploy/compose.staging.yml up -d
docker compose -f deploy/compose.staging.yml ps
```

Contrôles après déploiement :

```powershell
Invoke-WebRequest http://127.0.0.1:8080/healthz
Invoke-WebRequest https://<domaine-staging>/connexion
Invoke-WebRequest https://<origine-api-staging>/api/categories
```

Vérifier également les en-têtes de la page :

```powershell
(Invoke-WebRequest -Method Head https://<domaine-staging>).Headers
```

La réponse doit contenir notamment `Content-Security-Policy`,
`Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy` et
`Permissions-Policy`.

## Routage SPA et PWA

La configuration Nginx applique les règles suivantes :

- toute route inconnue, comme `/connexion`, retourne `index.html` ;
- les fichiers versionnés de `/assets/` sont mis en cache un an ;
- `sw.js`, le manifeste et Workbox ne sont jamais mis en cache durablement ;
- le endpoint `/healthz` permet les sondes de disponibilité ;
- la CSP autorise uniquement l'origine API fournie lors du build.
- les médias privés peuvent être délivrés uniquement depuis `https://res.cloudinary.com` ;
  les envois passent toujours par Laravel et aucun secret Cloudinary n'est intégré au frontend.

## Rollback

Chaque mise en production doit consigner le tag immuable déployé. Pour revenir
à la version précédente :

1. retrouver le dernier tag `staging-<commit_sha>` fonctionnel dans GHCR ;
2. remplacer `FRONTEND_IMAGE_TAG` par ce tag ;
3. relancer Compose sans reconstruire l'image ;
4. vérifier `/healthz`, `/connexion` et un appel API public ;
5. consigner la cause et le tag restauré dans la carte Trello ou l'incident.

```powershell
$env:FRONTEND_IMAGE_TAG = 'staging-<previous_commit_sha>'
docker compose -f deploy/compose.staging.yml pull
docker compose -f deploy/compose.staging.yml up -d
```

Les assets utilisent des noms versionnés et le service worker est servi avec
`no-store`, ce qui permet aux navigateurs de détecter rapidement la version
restaurée. Aucune migration de base de données n'est effectuée par ce frontend.
