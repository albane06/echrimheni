# ECHRIMHENI — Modèle de Sécurité & Confidentialité (Sprint 2)

Ce document décrit les garanties de sécurité, le modèle d'autorisation et les mécanismes de protection des données mis en œuvre sur EchriMheni MVP v1.0.

---

## 1. Modèle d'Authentification & Rôles

Le système distingue trois rôles applicatifs stricts :
- **`BUYER`** : Acheteur pouvant créer des demandes d'inspection, réserver des créneaux, régler la prestation et consulter ses rapports.
- **`EXPERT`** : Professionnel indépendant soumis à vérification administrative (CNI + Registre de Commerce), réalisant les inspections sur le terrain.
- **`ADMIN`** : Administrateur central chargé de la validation des experts, de la supervision des missions et de l'audit.

### Protection contre l'Escalade de Privilèges (V-01)
- L'auto-attribution du rôle `ADMIN` lors de l'inscription publique est **strictement impossible**.
- Le trigger PostgreSQL `handle_new_user()` s'exécutant en `SECURITY DEFINER` force le rôle à `BUYER` ou `EXPERT`.
- Toute promotion vers le rôle `ADMIN` requiert l'exécution de la fonction sécurisée `promote_user_to_admin(p_user_id)` accessible uniquement par un administrateur authentifié ou le service role.

---

## 2. Row-Level Security (RLS) & Isolation des Données

Row-Level Security est activée sur l'ensemble des 17 tables :
- **`profiles`** : Les utilisateurs ne peuvent mettre à jour que leurs informations de contact, sans modifier leur colonne `role`.
- **`expert_documents`** : Documents privés strictement inaccessibles aux autres experts, aux acheteurs et au public. Seul l'expert concerné et l'administrateur peuvent les lire.
- **`bookings`** : Visibles uniquement par le Buyer demandeur, l'Expert assigné et l'Admin. Les statuts et montants ne peuvent être modifiés que via des RPC contrôlées.
- **`reports`** : Consultables uniquement une fois publiés (`is_published = true`) par les parties concernées.

---

## 3. Immuabilité des Rapports Publiés (V-03)

- Dès qu'un rapport passe au statut `REPORT_READY` avec `is_published = true`, **la policy RLS interdit formellement toute modification (UPDATE) ou suppression (DELETE)** par l'expert.
- Toute correction ultérieure doit faire l'objet d'un avenant ou d'une nouvelle version tracé dans l'historique d'audit.

---

## 4. Intégrité Financière & Idempotence des Paiements (V-05)

- **Calcul Serveur :** Les montants (part expert 85%, commission plateforme 15%) sont recalculés côté serveur et ne dépendent jamais des valeurs envoyées par le client.
- **Contrainte d'Idempotence :** La table `payments` dispose d'une contrainte d'unicité `uq_payment_transaction_ref`.
- Un appel répété ou un rejeu réseau avec la même référence de transaction renvoie immédiatement l'enregistrement existant sans double débit.

---

## 5. Sécurité du Stockage (Supabase Storage - V-04)

Trois buckets privés sont configurés avec des politiques d'accès étanches :
1. **`expert-documents`** (Privé, 10 Mo max, PDF/JPEG/PNG) : Contient les cartes d'identité (CNI) et Registres de Commerce (RC). Accessible uniquement via signed URLs temporaires générées pour l'administration.
2. **`inspection-media`** (Privé, 15 Mo max, JPEG/PNG/WebP/MP4) : Contient les photos prises lors du contrôle terrain.
3. **`reports`** (Privé, 20 Mo max, PDF) : Contient les exports PDF certifiés des rapports d'inspection.

---

## 6. Traçabilité & Journal d'Audit (`admin_actions`)

Toutes les opérations administratives sensibles créent un enregistrement immuable :
- `EXPERT_APPROVED`
- `EXPERT_REJECTED` (avec conservation obligatoire du motif)
- `EXPERT_SUSPENDED`
- `USER_PROMOTED_TO_ADMIN`

Les utilisateurs normaux ne disposent d'aucun droit d'écriture ou de modification sur la table `admin_actions`.
