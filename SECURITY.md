# ECHRIMHENI — Modèle de Sécurité, Confidentialité & Preuves Formelles (Sprint 2.1)

Ce document décrit les garanties formelles de sécurité, le modèle d'autorisation multi-tenant et les 5 théorèmes de sécurité prouvés sur EchriMheni MVP v1.0.

---

## 1. Théorème 1 : Isolation Étanchée Inter-Acheteurs (Cross-Buyer Isolation)
> **« Un Buyer A ne peut accéder à aucune donnée de Buyer B. »**
- **RLS Listings :** Un acheteur ne peut lire ou modifier que les annonces dont `buyer_id = auth.uid()`.
- **RLS Bookings :** Les réservations d'un Buyer B sont invisibles et inaccessibles pour Buyer A.
- **RLS Payments :** Les paiements et transactions bancaires sont isolés par réservation rattachée au Buyer propriétaire.
- **RLS Reports :** Les rapports d'inspection générés sont strictement privés et réservés au Buyer de la mission (`b.buyer_id = auth.uid()`). Buyer A ne peut ni voir ni télécharger le rapport de Buyer B.
- **Preuve automatisée :** `tests/sprint2-1-security-proof.test.ts` (section *Theorem 1*).

---

## 2. Théorème 2 : Périmètre d'Action des Experts & Confidentialité des Justificatifs
> **« Un Expert A ne peut accéder qu'aux missions autorisées. »**
- **Confidentialité des Dossiers RC & CNI :** Les pièces d'identité et registres de commerce sont stockés dans le bucket privé `expert-documents`. Un Expert A ne peut en aucun cas lire ou télécharger les documents sensibles de l'Expert B.
- **Isolation des Missions :** Un Expert A ne peut ni accepter, ni inspecter, ni soumettre des réponses pour une mission assignée à l'Expert B.
- **Preuve automatisée :** `tests/sprint2-1-security-proof.test.ts` (section *Theorem 2*).

---

## 3. Théorème 3 : Verrouillage Strict des Experts Non-Approuvés
> **« Un expert PENDING ne peut jamais prendre une mission. »**
- **Invisibilité dans l'annuaire :** La requête publique `getApprovedExperts()` applique la condition obligatoire `verification_status = 'APPROVED'`. Les experts `PENDING`, `REJECTED` ou `SUSPENDED` ne sont jamais renvoyés aux acheteurs.
- **Verrou Serveur sur la State Machine :** Dans `transition_booking_rpc`, toute transition vers `ACCEPTED` ou `IN_PROGRESS` vérifie l'existence d'une approbation active (`verification_status = 'APPROVED'`). Tout appel par un expert `PENDING` est immédiatement rejeté avec une exception PostgreSQL.
- **Preuve automatisée :** `tests/sprint2-1-security-proof.test.ts` (section *Theorem 3*).

---

## 4. Théorème 4 : Impossibilité d'Élévation au Rôle ADMIN
> **« Un utilisateur normal ne peut jamais devenir ADMIN. »**
- **Sanitisation à l'inscription :** Le trigger `handle_new_user()` sur `auth.users` force le rôle à `BUYER` ou `EXPERT`. Toute valeur `ADMIN` fournie par le client est écrasée.
- **Verrouillage de la table Profiles :** La policy RLS `Profiles insert restriction` et `WITH CHECK (role = current_role)` empêche toute modification de rôle via requête directe.
- **Protection de la RPC de promotion :** La fonction `promote_user_to_admin()` vérifie formellement `is_admin(auth.uid())` ou le token `service_role`. Tout appel par un utilisateur non-administrateur échoue immédiatement.
- **Preuve automatisée :** `tests/sprint2-1-security-proof.test.ts` (section *Theorem 4*).

---

## 5. Théorème 5 : Intégrité Inviolable des Prix, Paiements, Scores et Rapports
> **« Aucun utilisateur ne peut fabriquer/modifier le prix, le paiement, le score ou le rapport. »**
- **Intégrité des Prix :** Contraintes de vérification `price_total > 0` et recalcul obligatoire serveur de la commission (15%) et de la part expert (85%).
- **Idempotence & Anti-Rejeu :** Contrainte `UNIQUE(transaction_ref)` sur `payments` et RPC `process_payment_rpc` empêchant les doubles débits et les paiements factices.
- **Calcul Serveur Inviolable du Score :** Le score n'est jamais accepté depuis le client. Il est recalculé côté serveur à partir des réponses enregistrées, appliquant les pondérations et le plafonnement strict à 49/100 en cas de défaut `CRITIQUE`.
- **Immuabilité des Rapports :** Dès lors qu'un rapport est publié (`is_published = true`), toute modification `UPDATE` ou suppression `DELETE` par l'expert ou le client est strictement rejetée par la base de données.
- **Preuve automatisée :** `tests/sprint2-1-security-proof.test.ts` (section *Theorem 5*).
