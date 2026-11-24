-- ==============================================================================
-- ECHRIMHENI P8.07 — Complément des 5 Grilles d'Inspection Terrain & Immobilier
-- ==============================================================================
-- Ce script complète les 2 templates P8.05 (2242 et 2252) en créant les grilles
-- dédiées et calibrées pour les 5 autres services spécialisés :
--   1. Service 2241 — Visite & Constat Visuel Terrain (4 sections, 8 items, poids 24)
--   2. Service 2243 — Audit Foncier & Rapprochement Documentaire (5 sections, 10 items, poids 39)
--   3. Service 2251 — Visite & Diagnostic Visuel Appartement (7 sections, 14 items, poids 42)
--   4. Service 2253 — Inspection Local Commercial & Bureaux (6 sections, 12 items, poids 38)
--   5. Service 2254 — Inspection Immeuble & Copropriété R+ (6 sections, 14 items, poids 52)
-- ==============================================================================
-- Idempotence totale garantie via ON CONFLICT (id) DO UPDATE.
-- ==============================================================================

-- ==============================================================================
-- 1. TEMPLATES D'INSPECTION (5 nouveaux templates)
-- ==============================================================================

INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES
    -- 1. Visite Terrain (2241)
    (
        '33333333-3333-3333-3333-333333333342',
        '22222222-2222-2222-2222-222222222241',
        'Grille de Constat Visuel Terrain v1.0',
        1,
        true
    ),
    -- 2. Audit Foncier (2243)
    (
        '33333333-3333-3333-3333-333333333343',
        '22222222-2222-2222-2222-222222222243',
        'Grille d''Audit Foncier & Rapprochement Cadastral v1.0',
        1,
        true
    ),
    -- 3. Diagnostic Appartement (2251)
    (
        '33333333-3333-3333-3333-333333333352',
        '22222222-2222-2222-2222-222222222251',
        'Grille de Diagnostic Visuel Appartement v1.0',
        1,
        true
    ),
    -- 4. Inspection Local Commercial (2253)
    (
        '33333333-3333-3333-3333-333333333353',
        '22222222-2222-2222-2222-222222222253',
        'Grille d''Inspection Local Commercial & Bureaux v1.0',
        1,
        true
    ),
    -- 5. Inspection Immeuble R+ (2254)
    (
        '33333333-3333-3333-3333-333333333354',
        '22222222-2222-2222-2222-222222222254',
        'Grille d''Inspection Immeuble & Copropriété R+ v1.0',
        1,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    service_id = EXCLUDED.service_id,
    title = EXCLUDED.title,
    version = EXCLUDED.version,
    is_active = EXCLUDED.is_active;

-- ==============================================================================
-- 2. SECTIONS D'INSPECTION (28 sections au total sur les 5 templates)
-- ==============================================================================

INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES
    -- --- Template 2241 (Visite Terrain - 4 sections) ---
    ('44444444-4444-4444-4444-444444444811', '33333333-3333-3333-3333-333333333342', 'Accès & Voirie d''Approche', 1),
    ('44444444-4444-4444-4444-444444444812', '33333333-3333-3333-3333-333333333342', 'Topographie & Relief Visuel', 2),
    ('44444444-4444-4444-4444-444444444813', '33333333-3333-3333-3333-333333333342', 'Limites Apparentes & Clôtures', 3),
    ('44444444-4444-4444-4444-444444444814', '33333333-3333-3333-3333-333333333342', 'Environnement Immédiat & Nuisances', 4),

    -- --- Template 2243 (Audit Foncier - 5 sections) ---
    ('44444444-4444-4444-4444-444444444821', '33333333-3333-3333-3333-333333333343', 'Documents Fonciers Déclarés', 1),
    ('44444444-4444-4444-4444-444444444822', '33333333-3333-3333-3333-333333333343', 'Concordance Géométrique Terrain / Documents', 2),
    ('44444444-4444-4444-4444-444444444823', '33333333-3333-3333-3333-333333333343', 'Bornage, Clôtures & Mitoyennetés', 3),
    ('44444444-4444-4444-4444-444444444824', '33333333-3333-3333-3333-333333333343', 'Servitudes, Droits d''Accès & Contraintes', 4),
    ('44444444-4444-4444-4444-444444444825', '33333333-3333-3333-3333-333333333343', 'Viabilisation en Limite de Propriété & POS', 5),

    -- --- Template 2251 (Diagnostic Appartement - 7 sections) ---
    ('44444444-4444-4444-4444-444444444911', '33333333-3333-3333-3333-333333333352', 'Structure & Gros Œuvre Intérieur', 1),
    ('44444444-4444-4444-4444-444444444912', '33333333-3333-3333-3333-333333333352', 'Menuiseries & Fermetures', 2),
    ('44444444-4444-4444-4444-444444444913', '33333333-3333-3333-3333-333333333352', 'Installation Électrique Intérieure', 3),
    ('44444444-4444-4444-4444-444444444914', '33333333-3333-3333-3333-333333333352', 'Plomberie & Sanitaires', 4),
    ('44444444-4444-4444-4444-444444444915', '33333333-3333-3333-3333-333333333352', 'Humidité & Revêtements Intérieurs', 5),
    ('44444444-4444-4444-4444-444444444916', '33333333-3333-3333-3333-333333333352', 'Chauffage, Gaz & Aération', 6),
    ('44444444-4444-4444-4444-444444444917', '33333333-3333-3333-3333-333333333352', 'Accès Palier & Parties Communes Immédiates', 7),

    -- --- Template 2253 (Inspection Local Commercial - 6 sections) ---
    ('44444444-4444-4444-4444-444444444921', '33333333-3333-3333-3333-333333333353', 'Vitrine, Façade & Accessibilité Commerciale', 1),
    ('44444444-4444-4444-4444-444444444922', '33333333-3333-3333-3333-333333333353', 'Rideaux de Protection & Fermetures', 2),
    ('44444444-4444-4444-4444-444444444923', '33333333-3333-3333-3333-333333333353', 'Volume Exploitable & Aménagements Intérieurs', 3),
    ('44444444-4444-4444-4444-444444444924', '33333333-3333-3333-3333-333333333353', 'Puissance Électrique & Éclairage Tertiaire', 4),
    ('44444444-4444-4444-4444-444444444925', '33333333-3333-3333-3333-333333333353', 'Ventilation, Extraction & Climatisation', 5),
    ('44444444-4444-4444-4444-444444444926', '33333333-3333-3333-3333-333333333353', 'Sécurité Incendie, Issues & Sanitaires', 6),

    -- --- Template 2254 (Inspection Immeuble R+ - 6 sections) ---
    ('44444444-4444-4444-4444-444444444931', '33333333-3333-3333-3333-333333333354', 'Gros Œuvre, Structure Béton Armé & Façades', 1),
    ('44444444-4444-4444-4444-444444444932', '33333333-3333-3333-3333-333333333354', 'Toiture-Terrasse Collective & Évacuations Pluviales', 2),
    ('44444444-4444-4444-4444-444444444933', '33333333-3333-3333-3333-333333333354', 'Circulations Communes & Cage d''Escalier', 3),
    ('44444444-4444-4444-4444-444444444934', '33333333-3333-3333-3333-333333333354', 'Ascenseur & Colonnes Techniques Montantes', 4),
    ('44444444-4444-4444-4444-444444444935', '33333333-3333-3333-3333-333333333354', 'Sous-Sol, Caves & Aires de Stationnement', 5),
    ('44444444-4444-4444-4444-444444444936', '33333333-3333-3333-3333-333333333354', 'Sécurité Incendie Collective & Désenfumage', 6)
ON CONFLICT (id) DO UPDATE SET
    template_id = EXCLUDED.template_id,
    title = EXCLUDED.title,
    order_index = EXCLUDED.order_index;

-- ==============================================================================
-- 3. ITEMS DE CHECKLIST (58 items pondérés au total sur les 5 templates)
-- ==============================================================================

INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    -- ==========================================================================
    -- TEMPLATE 2241 : Visite Terrain (8 items, poids total : 24)
    -- ==========================================================================
    -- Section 1 : Accès & Voirie (2 items)
    ('55555555-5555-5555-5555-000000001101', '44444444-4444-4444-4444-444444444811', 'Voie d''accès carrossable menant à la parcelle', 'Constat de l''état du chemin ou de la route (goudron, piste carrossable, ornières)', 3, true, 1),
    ('55555555-5555-5555-5555-000000001102', '44444444-4444-4444-4444-444444444811', 'Facilité de desserte et praticabilité véhicules légers', 'Largeur suffisante de la voie pour le passage sans encombre', 3, true, 2),

    -- Section 2 : Topographie & Relief (2 items)
    ('55555555-5555-5555-5555-000000001103', '44444444-4444-4444-4444-444444444812', 'Assiette générale du terrain et planéité apparente', 'Terrain plat, en pente douce ou forte déclivité apparente', 3, true, 1),
    ('55555555-5555-5555-5555-000000001104', '44444444-4444-4444-4444-444444444812', 'Encombrement apparent du sol et état de surface', 'Présence d''arbres, broussailles, roches visibles ou déblais à évacuer', 2, true, 2),

    -- Section 3 : Limites Apparentes (2 items)
    ('55555555-5555-5555-5555-000000001105', '44444444-4444-4444-4444-444444444813', 'Visibilité des repères physiques ou bornes d''angle', 'Repérage visuel des piquets, bornes béton ou angles matérialisés', 4, true, 1),
    ('55555555-5555-5555-5555-000000001106', '44444444-4444-4444-4444-444444444813', 'Clôtures existantes ou séparation visuelle avec le voisinage', 'Présence de muret, grillage ou délimitation naturelle', 2, true, 2),

    -- Section 4 : Environnement & Nuisances (2 items)
    ('55555555-5555-5555-5555-000000001107', '44444444-4444-4444-4444-444444444814', 'Constat des constructions environnantes et mitoyennetés', 'Nature du voisinage (habitations, hangars, parcelles nues)', 3, true, 1),
    ('55555555-5555-5555-5555-000000001108', '44444444-4444-4444-4444-444444444814', 'Absence de nuisances majeures à proximité immédiate', 'Absence de décharge sauvage, oued dangereux ou lignes à haute tension', 4, true, 2),

    -- ==========================================================================
    -- TEMPLATE 2243 : Audit Foncier (10 items, poids total : 39)
    -- ==========================================================================
    -- Section 1 : Documents Déclarés (2 items)
    ('55555555-5555-5555-5555-000000001201', '44444444-4444-4444-4444-444444444821', 'Présence et concordance du livret foncier ou acte notarié déclaré', 'Vérification des désignations et mentions portées au titre déclaré', 4, true, 1),
    ('55555555-5555-5555-5555-000000001202', '44444444-4444-4444-4444-444444444821', 'Présence et lisibilité du plan cadastral ou plan de bornage', 'Disponibilité du plan avec dimensions, angles et références', 4, true, 2),

    -- Section 2 : Concordance Géométrique (2 items)
    ('55555555-5555-5555-5555-000000001203', '44444444-4444-4444-4444-444444444822', 'Concordance de forme, d''orientation et de façade avec le plan', 'Confrontation visuelle de la géométrie de la parcelle avec le plan cadastral', 5, true, 1),
    ('55555555-5555-5555-5555-000000001204', '44444444-4444-4444-4444-444444444822', 'Estimation de surface apparente cohérente avec la superficie déclarée', 'Contrôle d''ordre de grandeur entre périmètre physique et contenance déclarée', 4, true, 2),

    -- Section 3 : Bornage & Mitoyennetés (2 items)
    ('55555555-5555-5555-5555-000000001205', '44444444-4444-4444-4444-444444444823', 'Présence et intégrité des bornes géomètres scellées', 'Examen physique des bornes aux angles stratégiques de la parcelle', 4, true, 1),
    ('55555555-5555-5555-5555-000000001206', '44444444-4444-4444-4444-444444444823', 'Absence d''empiètement apparent sur ou par les parcelles voisines', 'Vérification de l''alignement des murs de clôture ou constructions mitoyennes', 4, true, 2),

    -- Section 4 : Servitudes & Droits d'Accès (2 items)
    ('55555555-5555-5555-5555-000000001207', '44444444-4444-4444-4444-444444444824', 'Desserte légale et absence d''enclavement apparent', 'Voie d''accès reconnue ou servitude de passage conventionnelle matérialisée', 5, true, 1),
    ('55555555-5555-5555-5555-000000001208', '44444444-4444-4444-4444-444444444824', 'Absence de servitudes de réseaux traversants non déclarées', 'Conduite d''eau forcée, gazoduc ou ligne électrique traversant le terrain', 3, true, 2),

    -- Section 5 : Viabilisation en Limite & POS (2 items)
    ('55555555-5555-5555-5555-000000001209', '44444444-4444-4444-4444-444444444825', 'Disponibilité des réseaux publics en limite immédiate', 'Réseaux eau, électricité, gaz longeant la voie en façade', 3, true, 1),
    ('55555555-5555-5555-5555-000000001210', '44444444-4444-4444-4444-444444444825', 'Concordance avec la vocation apparente du secteur (constructibilité)', 'Zone urbanisée, lotissement approuvé ou zone agricole protégée', 3, true, 2),

    -- ==========================================================================
    -- TEMPLATE 2251 : Diagnostic Appartement (14 items, poids total : 42)
    -- ==========================================================================
    -- Section 1 : Structure Intérieure (2 items)
    ('55555555-5555-5555-5555-000000001301', '44444444-4444-4444-4444-444444444911', 'Absence de fissures structurelles sur murs porteurs, dalles et poteaux', 'Contrôle visuel des porteurs intérieurs, linteaux et cloisons principales', 5, true, 1),
    ('55555555-5555-5555-5555-000000001302', '44444444-4444-4444-4444-444444444911', 'Planéité et stabilité des planchers intérieurs', 'Absence d''affaissement, fléchissement ou désaffleurement de plancher', 3, true, 2),

    -- Section 2 : Menuiseries & Fermetures (2 items)
    ('55555555-5555-5555-5555-000000001303', '44444444-4444-4444-4444-444444444912', 'Porte d''entrée blindée/palière : serrure, aplomb et blindage', 'Sécurité de fermeture, gâche, aplomb et étanchéité de la porte palière', 3, true, 1),
    ('55555555-5555-5555-5555-000000001304', '44444444-4444-4444-4444-444444444912', 'Fenêtres, vitrages et volets roulants opérationnels', 'Ouverture, fermeture, étanchéité au vent et mécanismes de tablier', 2, true, 2),

    -- Section 3 : Installation Électrique (2 items)
    ('55555555-5555-5555-5555-000000001305', '44444444-4444-4444-4444-444444444913', 'Tableau électrique principal et protection différentielle', 'Disjoncteur de branchement, disjoncteurs divisionnaires et différentiel 30mA', 4, true, 1),
    ('55555555-5555-5555-5555-000000001306', '44444444-4444-4444-4444-444444444913', 'Sécurité des prises, interrupteurs et mise à la terre visible', 'Fixation des appareillages, présence de plots de terre et absence de fils nus', 3, true, 2),

    -- Section 4 : Plomberie & Sanitaires (2 items)
    ('55555555-5555-5555-5555-000000001307', '44444444-4444-4444-4444-444444444914', 'Robinetterie, vanne générale et étanchéité des arrivées d''eau', 'Pression satisfaisante, manœuvre de la vanne d''arrêt et absence de fuite', 3, true, 1),
    ('55555555-5555-5555-5555-000000001308', '44444444-4444-4444-4444-444444444914', 'Évacuations des eaux usées (WC, douche, évier) sans refoulement', 'Écoulement direct sans stagnation, gargouillement ni odeurs de siphon', 3, true, 2),

    -- Section 5 : Humidité & Revêtements (2 items)
    ('55555555-5555-5555-5555-000000001309', '44444444-4444-4444-4444-444444444915', 'Absence d''infiltrations, moisissures ou salpêtre sur parois', 'Recherche de traces d''humidité sous fenêtres, angles de plafond et gaines', 4, true, 1),
    ('55555555-5555-5555-5555-000000001310', '44444444-4444-4444-4444-444444444915', 'État des revêtements de sol (carrelage, parquet) et faïences', 'Adhérence des carreaux, régularité des joints et absence de cassures', 2, true, 2),

    -- Section 6 : Chauffage, Gaz & Aération (2 items)
    ('55555555-5555-5555-5555-000000001311', '44444444-4444-4444-4444-444444444916', 'Sécurité de l''alimentation gaz et évacuation du chauffe-eau', 'Conduit d''évacuation des gaz brûlés étanche vers l''extérieur et robinet gaz', 4, true, 1),
    ('55555555-5555-5555-5555-000000001312', '44444444-4444-4444-4444-444444444916', 'Aération naturelle et ventilation des pièces d''eau', 'Grilles de ventilation haute/basse non obstruées et aération fonctionnelle', 2, true, 2),

    -- Section 7 : Parties Communes Immédiates (2 items)
    ('55555555-5555-5555-5555-000000001313', '44444444-4444-4444-4444-444444444917', 'État de la cage d''escalier, paliers et ascenseur de l''étage', 'Éclairage du palier, propreté des circulations et cabine d''ascenseur', 2, true, 1),
    ('55555555-5555-5555-5555-000000001314', '44444444-4444-4444-4444-444444444917', 'Interphone / digicode et fermeture de l''immeuble', 'Système d''ouverture à distance et gâche électrique du hall d''entrée', 2, true, 2),

    -- ==========================================================================
    -- TEMPLATE 2253 : Inspection Local Commercial (12 items, poids total : 38)
    -- ==========================================================================
    -- Section 1 : Vitrine & Façade (2 items)
    ('55555555-5555-5555-5555-000000001401', '44444444-4444-4444-4444-444444444921', 'Linéaire de vitrine, vitrage de sécurité et enseigne', 'Visibilité commerciale, intégrité du vitrage feuilleté et fixations enseigne', 3, true, 1),
    ('55555555-5555-5555-5555-000000001402', '44444444-4444-4444-4444-444444444921', 'Accessibilité de plain-pied et conformité accès PMR', 'Absence de ressaut bloquant ou présence d''une rampe conforme d''accès', 4, true, 2),

    -- Section 2 : Rideaux & Fermetures (2 items)
    ('55555555-5555-5555-5555-000000001403', '44444444-4444-4444-4444-444444444922', 'Rideau métallique de sécurité et mécanisme motorisé/manuel', 'Fonctionnement de la fermeture extérieure, coulisses et débrayage manuel', 3, true, 1),
    ('55555555-5555-5555-5555-000000001404', '44444444-4444-4444-4444-444444444922', 'Porte d''accès clientèle et issues de service', 'Largeur de passage conforme, état de la serrure et barre anti-panique', 3, true, 2),

    -- Section 3 : Volume & Aménagements (2 items)
    ('55555555-5555-5555-5555-000000001405', '44444444-4444-4444-4444-444444444923', 'Hauteur sous plafond utile et volume d''exploitation', 'Hauteur sous dalle ou faux-plafond adaptée à l''activité commerciale ou tertiaire', 3, true, 1),
    ('55555555-5555-5555-5555-000000001406', '44444444-4444-4444-4444-444444444923', 'Résistance des sols grand passage et état des parois', 'Carrelage commercial, dallage résine ou béton anti-poussière sans cassure', 2, true, 2),

    -- Section 4 : Électricité Tertiaire (2 items)
    ('55555555-5555-5555-5555-000000001407', '44444444-4444-4444-4444-444444444924', 'Tableau électrique tertiaire, disjoncteur général et triphasé', 'Puissance souscrite, tableau divisionnaire et équilibrage des phases 380V', 4, true, 1),
    ('55555555-5555-5555-5555-000000001408', '44444444-4444-4444-4444-444444444924', 'Éclairage principal et blocs autonomes de sécurité (BAES)', 'Éclairage d''évacuation opérationnel au-dessus des portes de sortie', 3, true, 2),

    -- Section 5 : Ventilation & Climatisation (2 items)
    ('55555555-5555-5555-5555-000000001409', '44444444-4444-4444-4444-444444444925', 'Système de ventilation, aération mécanique ou gaine d''extraction', 'Extraction d''air suffisante ou pré-équipement gaine pour commerce', 3, true, 1),
    ('55555555-5555-5555-5555-000000001410', '44444444-4444-4444-4444-444444444925', 'Installation de climatisation ou chauffage d''ambiance', 'Unités intérieures/extérieures, thermostat et état des gaines de soufflage', 2, true, 2),

    -- Section 6 : Sécurité Incendie & Commodités (2 items)
    ('55555555-5555-5555-5555-000000001411', '44444444-4444-4444-4444-444444444926', 'Dégagement immédiat des issues de secours et extincteurs', 'Issues de secours non entravées et emplacements signalés pour extincteurs', 5, true, 1),
    ('55555555-5555-5555-5555-000000001412', '44444444-4444-4444-4444-444444444926', 'Sanitaires réservés au personnel / clientèle et point d''eau', 'Bloc sanitaire avec lave-mains, ventilation et évacuation fonctionnelle', 3, true, 2),

    -- ==========================================================================
    -- TEMPLATE 2254 : Inspection Immeuble R+ (14 items, poids total : 52)
    -- ==========================================================================
    -- Section 1 : Gros Œuvre & Façades (3 items)
    ('55555555-5555-5555-5555-000000001501', '44444444-4444-4444-4444-444444444931', 'Absence de désordres structurels majeurs sur poteaux et poutres porteurs', 'Contrôle des appuis, linteaux, voiles béton et absence de fléchissement', 5, true, 1),
    ('55555555-5555-5555-5555-000000001502', '44444444-4444-4444-4444-444444444931', 'Stabilité des façades extérieures, balcons et acrotères collectifs', 'Absence d''éclats de béton rouillé, garde-corps scellés et crépis adhérents', 4, true, 2),
    ('55555555-5555-5555-5555-000000001503', '44444444-4444-4444-4444-444444444931', 'Joints de dilatation de l''immeuble et absence de tassement différentiel', 'Intégrité des couvre-joints sans rupture ni désalignement des corps de bâtis', 4, true, 3),

    -- Section 2 : Toiture-Terrasse Collective (2 items)
    ('55555555-5555-5555-5555-000000001504', '44444444-4444-4444-4444-444444444932', 'Complexe d''étanchéité de la toiture-terrasse collective', 'Contrôle de la chape bitumineuse, solins périphériques et absence de cloques', 5, true, 1),
    ('55555555-5555-5555-5555-000000001505', '44444444-4444-4444-4444-444444444932', 'Descentes d''eaux pluviales, avaloirs et chéneaux collectifs', 'Évacuation rapide des eaux de pluie sans retenue ni infiltration sous chape', 3, true, 2),

    -- Section 3 : Circulations Communes (2 items)
    ('55555555-5555-5555-5555-000000001506', '44444444-4444-4444-4444-444444444933', 'Solidité de la cage d''escalier, marches, garde-corps et paliers', 'Main courante rigide, marches non dégradées et paliers carrelés stables', 3, true, 1),
    ('55555555-5555-5555-5555-000000001507', '44444444-4444-4444-4444-444444444933', 'Éclairage des parties communes, minuterie et secours', 'Fonctionnement des poussoirs de minuterie et éclairage de tous les étages', 2, true, 2),

    -- Section 4 : Ascenseur & Colonnes Montantes (3 items)
    ('55555555-5555-5555-5555-000000001508', '44444444-4444-4444-4444-444444444934', 'Machinerie d''ascenseur, câbles et cabine en service', 'Fonctionnement régulier de l''ascenseur collectif, portes et contrôle périodique', 4, true, 1),
    ('55555555-5555-5555-5555-000000001509', '44444444-4444-4444-4444-444444444934', 'Colonne montante électrique Sonelgaz et gaines techniques', 'Fermeture à clé des gaines de palier et absence de raccordement sauvage', 4, true, 2),
    ('55555555-5555-5555-5555-000000001510', '44444444-4444-4444-4444-444444444934', 'Colonne montante d''eau, surpresseur collectif et bâche à eau', 'Alimentation continue des étages élevés et état de la bâche de reprise', 3, true, 3),

    -- Section 5 : Sous-Sol & Stationnement (2 items)
    ('55555555-5555-5555-5555-000000001511', '44444444-4444-4444-4444-444444444935', 'Absence de remontées d''eau ou d''infiltrations en sous-sol/parking', 'Radier et murs enterrés secs sans stagnation d''eau ni odeur d''égout', 4, true, 1),
    ('55555555-5555-5555-5555-000000001512', '44444444-4444-4444-4444-444444444935', 'Ventilation du sous-sol et rampe d''accès carrossable', 'Renouvellement d''air des boxes/parkings et adhérence de la rampe', 3, true, 2),

    -- Section 6 : Sécurité Incendie Collective (2 items)
    ('55555555-5555-5555-5555-000000001513', '44444444-4444-4444-4444-444444444936', 'Dispositif de désenfumage en tête de cage d''escalier (lanterneau)', 'Commande manuelle au RDC opérationnelle et ouverture du skydome sommital', 4, true, 1),
    ('55555555-5555-5555-5555-000000001514', '44444444-4444-4444-4444-444444444936', 'Portes coupe-feu de recoupement et accès secours pompiers', 'Ferme-portes coupe-feu fonctionnels et accès dégagé pour secours extérieurs', 4, true, 2)
ON CONFLICT (id) DO UPDATE SET
    section_id = EXCLUDED.section_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    weight = EXCLUDED.weight,
    is_required = EXCLUDED.is_required,
    order_index = EXCLUDED.order_index;

-- ==============================================================================
-- 4. REQUÊTE DE CONTRÔLE ET DE VALIDATION POST-INSERTION
-- ==============================================================================
-- Exécutez cette requête après l'insertion pour confirmer les totaux :
/*
SELECT 
    t.title AS template_title,
    s.name AS service_name,
    s.base_price AS prix_dzd,
    COUNT(DISTINCT sec.id) AS sections_count,
    COUNT(it.id) AS items_count,
    SUM(it.weight) AS total_weight
FROM public.inspection_templates t
JOIN public.services s ON s.id = t.service_id
LEFT JOIN public.inspection_sections sec ON sec.template_id = t.id
LEFT JOIN public.inspection_items it ON it.section_id = sec.id
WHERE t.id IN (
    '33333333-3333-3333-3333-333333333342',
    '33333333-3333-3333-3333-333333333343',
    '33333333-3333-3333-3333-333333333352',
    '33333333-3333-3333-3333-333333333353',
    '33333333-3333-3333-3333-333333333354'
)
GROUP BY t.id, t.title, s.name, s.base_price
ORDER BY s.base_price ASC;
*/
-- RÉSULTATS ATTENDUS DE LA REQUÊTE DE CONTRÔLE :
-- 1. Grille de Constat Visuel Terrain v1.0                 | 4 sections |  8 items | Poids : 24
-- 2. Grille de Diagnostic Visuel Appartement v1.0         | 7 sections | 14 items | Poids : 42
-- 3. Grille d'Inspection Local Commercial & Bureaux v1.0  | 6 sections | 12 items | Poids : 38
-- 4. Grille d'Audit Foncier & Rapprochement Cadastral v1.0| 5 sections | 10 items | Poids : 39
-- 5. Grille d'Inspection Immeuble & Copropriété R+ v1.0   | 6 sections | 14 items | Poids : 52
