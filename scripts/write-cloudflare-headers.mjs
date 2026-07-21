import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(repositoryRoot, 'dist');
const apiUrlValue = process.env.VITE_API_URL?.trim();

if (!apiUrlValue) {
  throw new Error('VITE_API_URL est obligatoire pour le build Cloudflare Pages.');
}

let apiUrl;

try {
  apiUrl = new URL(apiUrlValue);
} catch {
  throw new Error('VITE_API_URL doit être une URL HTTPS valide.');
}

const apiPath = apiUrl.pathname.replace(/\/+$/, '');

if (
  apiUrl.protocol !== 'https:' ||
  apiUrl.username !== '' ||
  apiUrl.password !== '' ||
  apiUrl.search !== '' ||
  apiUrl.hash !== '' ||
  apiPath !== '/api'
) {
  throw new Error(
    'VITE_API_URL doit être une URL HTTPS sans identifiants, query ou fragment, terminée par /api.',
  );
}

if (!existsSync(outputDirectory)) {
  throw new Error('Le dossier dist est absent. Exécuter le build Vite avant ce script.');
}

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "font-src 'self'",
  `connect-src 'self' ${apiUrl.origin}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const headers = `/*
  Content-Security-Policy: ${contentSecurityPolicy}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), geolocation=(self), microphone=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-store, no-cache, must-revalidate

/manifest.webmanifest
  Cache-Control: no-cache, must-revalidate

/workbox-*.js
  Cache-Control: no-cache, must-revalidate
`;

writeFileSync(join(outputDirectory, '_headers'), headers, 'utf8');

console.log(`En-têtes Cloudflare Pages générés pour ${apiUrl.origin}.`);
