-- ==============================================================================
-- ECHRIMHENI MVP v1.0 - Seed Data (Automobile Vertical Slice)
-- ==============================================================================

-- 1. Automobile Category
INSERT INTO public.categories (id, code, name, description, icon, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'automobile',
    'Automobile',
    'Inspection complète avant achat pour véhicules d\'occasion et neufs',
    'car',
    true
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Automobile Standard Service
INSERT INTO public.services (id, category_id, name, description, base_price, estimated_duration_minutes, is_active)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Diagnostic & Inspection Complète Automobile',
    'Inspection méticuleuse des 7 points de contrôle clés avec rapport détaillé et score indicatif.',
    7000,
    90,
    true
) ON CONFLICT (id) DO NOTHING;

-- 3. Inspection Template
INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '22222222-2222-2222-2222-222222222222',
    'Grille d\'inspection Automobile v1.0',
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. 7 Inspection Sections
INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES 
    ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333333', 'Moteur & Compartiment Moteur', 1),
    ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333333', 'Freinage & Roulage', 2),
    ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333333', 'Suspension & Direction', 3),
    ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333333', 'Carrosserie & Châssis', 4),
    ('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333333', 'Pneumatiques & Roues', 5),
    ('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333333', 'Électronique & OBD', 6),
    ('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333333', 'Habitacle & Équipements Intérieurs', 7)
ON CONFLICT (id) DO NOTHING;

-- 5. Checklist Items
-- Section 1: Moteur
INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    ('55555555-5555-5555-5555-000000000101', '44444444-4444-4444-4444-444444444401', 'Démarrage à froid/chaud & bruits anormaux', 'Vérification du claquement, bruits de poussoirs ou courroie', 3, true, 1),
    ('55555555-5555-5555-5555-000000000102', '44444444-4444-4444-4444-444444444401', 'Fumée à l\'échappement', 'Absence de fumée bleue, blanche continue ou noire excessive', 3, true, 2),
    ('55555555-5555-5555-5555-000000000103', '44444444-4444-4444-4444-444444444401', 'Fuites visibles d\'huile ou liquide de refroidissement', 'Joint de culasse, carter, radiateur', 3, true, 3),

-- Section 2: Freinage
    ('55555555-5555-5555-5555-000000000201', '44444444-4444-4444-4444-444444444402', 'Disques et plaquettes avant/arrière', 'Épaisseur et absence de rayures profondes ou voilage', 2, true, 1),
    ('55555555-5555-5555-5555-000000000202', '44444444-4444-4444-4444-444444444402', 'Comportement au freinage d\'urgence & frein à main', 'Absence de déportation latérale ou vibration anormale', 3, true, 2),

-- Section 3: Suspension & Direction
    ('55555555-5555-5555-5555-000000000301', '44444444-4444-4444-4444-444444444403', 'Amortisseurs et coupelles', 'Absence de fuite hydraulique ou rebond excessif', 2, true, 1),
    ('55555555-5555-5555-5555-000000000302', '44444444-4444-4444-4444-444444444403', 'Jeu de direction et rotules', 'Contrôle du jeu dans le volant et les biellettes', 2, true, 2),

-- Section 4: Carrosserie
    ('55555555-5555-5555-5555-000000000401', '44444444-4444-4444-4444-444444444404', 'Traces de choc antérieur & alignement des panneaux', 'Contrôle des longerons, soudures usine et écarts de carrosserie', 3, true, 1),
    ('55555555-5555-5555-5555-000000000402', '44444444-4444-4444-4444-444444444404', 'Peinture, raccords mastic & corrosion', 'Détection des retouches et rouille perforante sous châssis', 2, true, 2),

-- Section 5: Pneus
    ('55555555-5555-5555-5555-000000000501', '44444444-4444-4444-4444-444444444405', 'État et niveau d\'usure des pneumatiques', 'Témoins d\'usure, hernies et homogénéité par essieu', 2, true, 1),

-- Section 6: Électronique
    ('55555555-5555-5555-5555-000000000601', '44444444-4444-4444-4444-444444444406', 'Voyants au tableau de bord (Check Engine, Airbag, ABS)', 'Extinction normale après contact', 3, true, 1),
    ('55555555-5555-5555-5555-000000000602', '44444444-4444-4444-4444-444444444406', 'Climatisation, chauffage & lève-vitres', 'Fonctionnement effectif de tous les organes de confort', 1, true, 2),

-- Section 7: Intérieur
    ('55555555-5555-5555-5555-000000000701', '44444444-4444-4444-4444-444444444407', 'État général de la sellerie et ceintures de sécurité', 'Usure cohérente avec le kilométrage affiché', 1, true, 1)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- VERTICALE TÉLÉPHONE & SMARTPHONE (Cahier des Charges Section 8.2)
-- ==============================================================================

-- 1. Téléphone Category
INSERT INTO public.categories (id, code, name, description, icon, is_active)
VALUES (
    '11111111-1111-1111-1111-111111111112',
    'telephone',
    'Téléphone & Smartphone',
    'Inspection complète avant achat pour smartphones et téléphones d occasion',
    'smartphone',
    true
) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

-- 2. Téléphone Standard Service
INSERT INTO public.services (id, category_id, name, description, base_price, estimated_duration_minutes, is_active)
VALUES (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111112',
    'Diagnostic & Inspection Complète Smartphone',
    'Contrôle technique approfondi de l écran, de la batterie, des capteurs, caméras et de l historique d ouverture.',
    3000,
    35,
    true
) ON CONFLICT (id) DO NOTHING;

-- 3. Téléphone Inspection Template
INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333334',
    '22222222-2222-2222-2222-222222222223',
    'Grille d inspection Téléphone v1.0',
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- 4. 7 Inspection Sections Téléphone
INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES 
    ('44444444-4444-4444-4444-444444444501', '33333333-3333-3333-3333-333333333334', 'Écran & Affichage Tactile', 1),
    ('44444444-4444-4444-4444-444444444502', '33333333-3333-3333-3333-333333333334', 'Batterie & Autonomie', 2),
    ('44444444-4444-4444-4444-444444444503', '33333333-3333-3333-3333-333333333334', 'Bloc Caméras & Flash', 3),
    ('44444444-4444-4444-4444-444444444504', '33333333-3333-3333-3333-333333333334', 'Réseau, SIM & Connectivité', 4),
    ('44444444-4444-4444-4444-444444444505', '33333333-3333-3333-3333-333333333334', 'Audio, Microphones & Écouteurs', 5),
    ('44444444-4444-4444-4444-444444444506', '33333333-3333-3333-3333-333333333334', 'Ports, Boutons & Biométrie', 6),
    ('44444444-4444-4444-4444-444444444507', '33333333-3333-3333-3333-333333333334', 'Châssis & Historique d Ouverture', 7)
ON CONFLICT (id) DO NOTHING;

-- 5. Items Checklist Téléphone
INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    -- Section 1: Écran
    ('55555555-5555-5555-5555-000000000501', '44444444-4444-4444-4444-444444444501', 'Réactivité tactile & absence de zones mortes', 'Test multi-touch et défilement sur toute la dalle', 3, true, 1),
    ('55555555-5555-5555-5555-000000000502', '44444444-4444-4444-4444-444444444501', 'Dalle OLED/LCD (pixels morts, brûlures, luminosité)', 'Contrôle sur fond blanc et noir complet', 3, true, 2),
    ('55555555-5555-5555-5555-000000000503', '44444444-4444-4444-4444-444444444501', 'Vitre tactile & rayures', 'Absence de fissure traversante ou décollement', 2, true, 3),

    -- Section 2: Batterie
    ('55555555-5555-5555-5555-000000000504', '44444444-4444-4444-4444-444444444502', 'État de santé de la batterie (%) & cycles', 'Santé affichée et tenue en décharge rapide', 3, true, 1),
    ('55555555-5555-5555-5555-000000000505', '44444444-4444-4444-4444-444444444502', 'Comportement de charge & température', 'Vitesse de charge normale sans surchauffe anormale', 2, true, 2),

    -- Section 3: Caméras
    ('55555555-5555-5555-5555-000000000506', '44444444-4444-4444-4444-444444444503', 'Capteurs photo arrière (grand angle, téléobjectif)', 'Netteté, mise au point autofocus et stabilisation', 2, true, 1),
    ('55555555-5555-5555-5555-000000000507', '44444444-4444-4444-4444-444444444503', 'Caméra avant & Flash LED', 'Qualité selfie, flash et torche', 2, true, 2),

    -- Section 4: Réseau & Connectivité
    ('55555555-5555-5555-5555-000000000508', '44444444-4444-4444-4444-444444444504', 'Détection carte SIM & accroche réseau 4G/5G', 'Appel test et débit data mobile', 3, true, 1),
    ('55555555-5555-5555-5555-000000000509', '44444444-4444-4444-4444-444444444504', 'Wi-Fi, Bluetooth & GPS', 'Connexion stable et appairage', 2, true, 2),

    -- Section 5: Audio
    ('55555555-5555-5555-5555-000000000510', '44444444-4444-4444-4444-444444444505', 'Haut-parleurs stéréo & écouteur d appel', 'Clarté acoustique sans grésillement à plein volume', 2, true, 1),
    ('55555555-5555-5555-5555-000000000511', '44444444-4444-4444-4444-444444444505', 'Microphones d appel et de réduction de bruit', 'Enregistrement vocal clair', 2, true, 2),

    -- Section 6: Ports, Boutons & Biométrie
    ('55555555-5555-5555-5555-000000000512', '44444444-4444-4444-4444-444444444506', 'Port de charge (USB-C / Lightning)', 'Maintien mécanique du câble sans jeu excessif', 2, true, 1),
    ('55555555-5555-5555-5555-000000000513', '44444444-4444-4444-4444-444444444506', 'Reconnaissance biométrique (Face ID / Empreinte)', 'Déverrouillage instantané et fonctionnel', 3, true, 2),

    -- Section 7: Châssis & Historique Visible
    ('55555555-5555-5555-5555-000000000514', '44444444-4444-4444-4444-444444444507', 'Traces d ouverture, vis de châssis & étanchéité', 'Contrôle des vis pentalobe/torx et joints d étanchéité', 3, true, 1),
    ('55555555-5555-5555-5555-000000000515', '44444444-4444-4444-4444-444444444507', 'État général du châssis & tiroir SIM d origine', 'Absence de voilage ou déformation structurelle', 2, true, 2)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- VERTICALE ÉLECTROMÉNAGER (Extension Moteur Générique)
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

-- 2. Services Électroménager
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
