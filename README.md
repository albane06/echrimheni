# EchriMheni (إشري مهني) — Plateforme d'Inspection Pré-Achat

> **« Acheter en confiance. Faire vérifier avant de payer. »**

EchriMheni est la plateforme algérienne de mise en relation de confiance entre acheteurs d'objets d'occasion et experts techniques indépendants qualifiés, débutant avec la verticale **Automobile** (7 blocs de contrôle).

---

## Architecture du Monorepo

Le projet est articulé autour d'un monorepo **Turborepo** géré avec **pnpm** (v12) :

```text
d:/ECHRIMHENI/
├── apps/
│   ├── web-admin/         # Portail d'administration Next.js (App Router, Tailwind CSS)
│   └── mobile/            # Application mobile React Native + Expo (Buyer & Expert)
├── packages/
│   ├── shared/            # Types TypeScript, schémas Zod, state machine, scoring, paiement
│   └── database/          # Migrations Supabase, RLS, buckets Storage, seed & helpers
├── scripts/
│   └── run-e2e-demo.ts    # Script de démonstration du cycle de vie complet en console
└── tests/                 # Suite de tests automatisés (Vitest)
```

---

## Installation & Démarrage Rapide

### Prérequis
- **Node.js** >= 20 (testé sur v24)
- **pnpm** >= 10 (testé sur v12.4.1)
- **Docker** (optionnel pour Supabase local)

### 1. Installation des dépendances
```bash
pnpm install
```

### 2. Exécution des tests automatisés (30 tests)
```bash
pnpm test
```

### 3. Exécution de la démonstration End-to-End
```bash
pnpm run demo
```

### 4. Lancement du Back-Office Web Admin
```bash
pnpm --filter @echrimheni/web-admin dev
# Accessible sur http://localhost:3000
```

### 5. Lancement de l'Application Mobile Expo
```bash
pnpm --filter @echrimheni/mobile start
```

---

## Base de Données & Migrations Supabase

Les migrations PostgreSQL versionnées et idempotentes sont situées dans `packages/database/supabase/migrations/` :
1. `20260912000001_create_echrimheni_schema.sql` : Création des 17 tables fondamentales, contraintes et index.
2. `20260912000002_create_rls_and_functions.sql` : Activation de Row-Level Security (RLS) et fonctions de base.
3. `20260912000003_sprint2_hardening.sql` : Durcissement Sprint 2 (protection contre l'escalade de privilèges ADMIN, RPC de transition d'état, idempotence des paiements, immuabilité des rapports, buckets Storage privés).
4. `seed.sql` : Données d'initialisation de la verticale Automobile (Catégorie, Service, 7 sections et points de contrôle pondérés).

---

## Variables d'Environnement

Un fichier `.env.example` est fourni à la racine. Pour déployer sur un projet Supabase Cloud :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<votre-projet>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<votre-service-role-key>
```
