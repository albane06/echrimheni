// P6.10-B — Configuration Metro du package mobile (Expo SDK 52).
// `pdfkit` est une dépendance serveur uniquement (génération PDF via la route
// web-admin `/api/reports/[id]/pdf`). Aucun écran mobile ne l'appelle : il
// n'arrive dans le graphe que via le barrel `@echrimheni/database` (partagé,
// non modifiable ici). Metro ne sait pas résoudre `pdfkit@0.20.2` (package
// sans champ `main`, `exports` non supportés sur ce chemin) : on le mappe à
// un module vide, sans toucher au code partagé ni à la logique métier.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pdfkit') {
    return { type: 'empty' };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
