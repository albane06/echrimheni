-- ==============================================================================
-- ECHRIMHENI MVP v1.0 - Migration 04: Verticale Électroménager
-- ==============================================================================

-- 1. Catégorie Électroménager
INSERT INTO public.categories (id, code, name, description, icon, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111113',
    'electromenager',
    'Électroménager',
    'Inspection et diagnostic technique avant achat pour gros et petit électroménager d occasion',
    'refrigerator',
    true
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Services Électroménager (au minimum 2 services)
INSERT INTO public.services (id, category_id, name, description, base_price, estimated_duration_minutes, is_active)
VALUES 
    (
        '22222222-2222-2222-2222-222222222231',
        '11111111-1111-1111-1111-111111111113',
        'Diagnostic & Inspection Complète Électroménager',
        'Contrôle technique approfondi des 8 points clés : alimentation, compresseur/moteur, électronique, étanchéité et sécurité.',
        3500,
        45,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222232',
        '11111111-1111-1111-1111-111111111113',
        'Contrôle Fonctionnel Électroménager',
        'Vérification rapide du démarrage, des cycles de base et de l état extérieur visible.',
        2500,
        30,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- 3. Template d'Inspection Électroménager
INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333335',
    '22222222-2222-2222-2222-222222222231',
    'Grille d inspection Électroménager v1.0',
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. 8 Sections d'Inspection Électroménager
INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES 
    ('44444444-4444-4444-4444-444444444701', '33333333-3333-3333-3333-333333333335', 'Identification & Référence', 1),
    ('44444444-4444-4444-4444-444444444702', '33333333-3333-3333-3333-333333333335', 'État Extérieur & Structure', 2),
    ('44444444-4444-4444-4444-444444444703', '33333333-3333-3333-3333-333333333335', 'Alimentation Électrique & Câblage', 3),
    ('44444444-4444-4444-4444-444444444704', '33333333-3333-3333-3333-333333333335', 'Fonctionnement Principal & Cycles', 4),
    ('44444444-4444-4444-4444-444444444705', '33333333-3333-3333-3333-333333333335', 'Commandes, Afficheur & Électronique', 5),
    ('44444444-4444-4444-4444-444444444706', '33333333-3333-3333-3333-333333333335', 'Bruits, Vibrations & Température', 6),
    ('44444444-4444-4444-4444-444444444707', '33333333-3333-3333-3333-333333333335', 'Sécurité, Étanchéité & Anomalies', 7),
    ('44444444-4444-4444-4444-444444444708', '33333333-3333-3333-3333-333333333335', 'Accessoires, Tuyaux & Historique', 8)
ON CONFLICT (id) DO NOTHING;

-- 5. 16 Items de Checklist Électroménager (Pondérés, somme des poids = 38)
INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    -- Section 1: Identification & Référence
    ('55555555-5555-5555-5555-000000000801', '44444444-4444-4444-4444-444444444701', 'Plaque signalétique, marque, modèle et n° de série lisibles', 'Contrôle de conformité de l étiquette constructeur', 2, true, 1),
    ('55555555-5555-5555-5555-000000000802', '44444444-4444-4444-4444-444444444701', 'Conformité de la référence constructeur et année', 'Vérification de l authenticité de la référence constructeur', 2, true, 2),

    -- Section 2: État Extérieur & Structure
    ('55555555-5555-5555-5555-000000000803', '44444444-4444-4444-4444-444444444702', 'Carrosserie, parois, absence d enfoncement ou corrosion', 'Contrôle de l aspect esthétique et intégrité des tôles', 2, true, 1),
    ('55555555-5555-5555-5555-000000000804', '44444444-4444-4444-4444-444444444702', 'Charnières, poignées, pieds réglables et fermetures', 'Alignement des portes et maintien mécanique', 2, true, 2),

    -- Section 3: Alimentation Électrique & Câblage
    ('55555555-5555-5555-5555-000000000805', '44444444-4444-4444-4444-444444444703', 'Cordon secteur, fiche 220V et mise à la terre conforme', 'Vérification de l état du câble et isolation électrique', 3, true, 1),
    ('55555555-5555-5555-5555-000000000806', '44444444-4444-4444-4444-444444444703', 'Absence d échauffement anormal ou odeur de brûlé', 'Mesure thermique en fonctionnement continu', 3, true, 2),

    -- Section 4: Fonctionnement Principal & Cycles
    ('55555555-5555-5555-5555-000000000807', '44444444-4444-4444-4444-444444444704', 'Démarrage effectif du cycle principal (moteur/compresseur)', 'Mise en route du moteur principal sans accroc ni blocage', 3, true, 1),
    ('55555555-5555-5555-5555-000000000808', '44444444-4444-4444-4444-444444444704', 'Efficacité du cycle opérationnel (froid/chaud/rotation/vidange)', 'Rendement fonctionnel conforme aux caractéristiques', 3, true, 2),

    -- Section 5: Commandes, Afficheur & Électronique
    ('55555555-5555-5555-5555-000000000809', '44444444-4444-4444-4444-444444444705', 'Panneau de commande, boutons tactiles/rotatifs et sélecteur', 'Réactivité de l ensemble des touches et molettes', 2, true, 1),
    ('55555555-5555-5555-5555-000000000810', '44444444-4444-4444-4444-444444444705', 'Afficheur digital LED/LCD et absence de code erreur actif', 'Contrôle des segments d affichage et voyants d alerte', 2, true, 2),

    -- Section 6: Bruits, Vibrations & Température
    ('55555555-5555-5555-5555-000000000811', '44444444-4444-4444-4444-444444444706', 'Niveau sonore en régime établi et absence de claquement', 'Écoute des roulements, paliers et amortisseurs', 2, true, 1),
    ('55555555-5555-5555-5555-000000000812', '44444444-4444-4444-4444-444444444706', 'Stabilité mécanique, absorption des vibrations et équilibrage', 'Vérification du calage et absence de débattement excessif', 2, true, 2),

    -- Section 7: Sécurité, Étanchéité & Anomalies
    ('55555555-5555-5555-5555-000000000813', '44444444-4444-4444-4444-444444444707', 'Étanchéité des joints de porte, cuve ou circuit frigorifique', 'Contrôle de condensation, suintement ou fuite de fluide', 3, true, 1),
    ('55555555-5555-5555-5555-000000000814', '44444444-4444-4444-4444-444444444707', 'Systèmes de sécurité (verrouillage porte, thermostat, anti-fuite)', 'Test de coupure d urgence et détection sécurité', 3, true, 2),

    -- Section 8: Accessoires, Tuyaux & Historique
    ('55555555-5555-5555-5555-000000000815', '44444444-4444-4444-4444-444444444708', 'Présence et état des accessoires d origine (filtres, clayettes)', 'Inventaire des éléments amovibles d origine', 2, true, 1),
    ('55555555-5555-5555-5555-000000000816', '44444444-4444-4444-4444-444444444708', 'Tuyaux d alimentation/évacuation d eau sans pliure ni fissure', 'Contrôle visuel des flexibles et raccords hydrauliques', 2, true, 2)
ON CONFLICT (id) DO NOTHING;
