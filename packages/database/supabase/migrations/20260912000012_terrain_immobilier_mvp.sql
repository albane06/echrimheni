-- ==============================================================================
-- ECHRIMHENI P8.05-B — Extension Terrain / Foncier & Immobilier Bâti (MVP)
-- ==============================================================================
-- 1. Compatibilité descendante : make/model/year deviennent optionnels sur listings
-- 2. Table d'extension listing_real_estate pour attributs fonciers et bâtis
-- 3. Catégories 'terrain' et 'immobilier'
-- 4. 7 Services spécialisés avec tarifs configurables
-- 5. Grilles d'inspection (templates, sections, items pondérés)
-- 6. Politiques RLS étanches pour listing_real_estate
-- ==============================================================================

-- 1. Adaptation souple de la table listings
DO $$
BEGIN
  -- Rendre make, model et year optionnels pour permettre aux listings fonciers/immobiliers d'exister
  ALTER TABLE public.listings ALTER COLUMN make DROP NOT NULL;
  ALTER TABLE public.listings ALTER COLUMN model DROP NOT NULL;
  ALTER TABLE public.listings ALTER COLUMN year DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Déjà appliqué ou table compatible
END
$$;

-- 2. Table d'extension listing_real_estate
CREATE TABLE IF NOT EXISTS public.listing_real_estate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    domain TEXT NOT NULL CHECK (domain IN ('TERRAIN', 'IMMOBILIER')),
    property_type TEXT NOT NULL,
    surface_m2 NUMERIC(12, 2) NOT NULL CHECK (surface_m2 > 0),
    cadastral_ref TEXT,
    property_paper_declared TEXT,
    gps_lat NUMERIC(10, 7),
    gps_lng NUMERIC(10, 7),
    gps_address_note TEXT,
    topography TEXT,
    road_access TEXT,
    access_road_type TEXT,
    utilities JSONB NOT NULL DEFAULT '{"water": false, "electricity": false, "gas": false, "sewage": false, "sanitation_type": "none"}'::jsonb,
    rooms INTEGER CHECK (rooms IS NULL OR rooms >= 0),
    rooms_count INTEGER CHECK (rooms_count IS NULL OR rooms_count >= 0),
    floors INTEGER,
    floor_number INTEGER,
    total_floors INTEGER CHECK (total_floors IS NULL OR total_floors >= 0),
    condition TEXT,
    building_condition TEXT,
    construction_year INTEGER CHECK (construction_year IS NULL OR (construction_year >= 1800 AND construction_year <= 2100)),
    parking_spaces INTEGER CHECK (parking_spaces IS NULL OR parking_spaces >= 0),
    has_elevator BOOLEAN DEFAULT false,
    boundary_fenced BOOLEAN DEFAULT false,
    soil_type TEXT,
    zoning TEXT,
    heating_type TEXT,
    notes TEXT,
    additional_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_listing_real_estate_listing_id UNIQUE (listing_id)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_listing_real_estate_listing_id ON public.listing_real_estate(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_real_estate_domain ON public.listing_real_estate(domain);
CREATE INDEX IF NOT EXISTS idx_listing_real_estate_property_type ON public.listing_real_estate(property_type);

-- RLS sur listing_real_estate
ALTER TABLE public.listing_real_estate ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'listing_real_estate_select' AND tablename = 'listing_real_estate') THEN
    CREATE POLICY "listing_real_estate_select" ON public.listing_real_estate
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.id = listing_real_estate.listing_id
            AND (
              l.buyer_id = auth.uid()
              OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
              OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.listing_id = l.id AND b.expert_id = auth.uid())
            )
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'listing_real_estate_insert' AND tablename = 'listing_real_estate') THEN
    CREATE POLICY "listing_real_estate_insert" ON public.listing_real_estate
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.id = listing_real_estate.listing_id
            AND l.buyer_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'listing_real_estate_update' AND tablename = 'listing_real_estate') THEN
    CREATE POLICY "listing_real_estate_update" ON public.listing_real_estate
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.listings l
          WHERE l.id = listing_real_estate.listing_id
            AND l.buyer_id = auth.uid()
        )
      );
  END IF;
END
$$;

-- 3. Catégories Terrain et Immobilier
INSERT INTO public.categories (id, code, name, description, icon, is_active)
VALUES 
    (
        '11111111-1111-1111-1111-111111111114',
        'terrain',
        'Terrain & Foncier',
        'Visite, inspection technique, viabilisation et constat d environnement pour terrains et parcelles',
        'map-pin',
        true
    ),
    (
        '11111111-1111-1111-1111-111111111115',
        'immobilier',
        'Immobilier & Bâti',
        'Visite, diagnostic technique visuel et état des lieux pour appartements, villas, locaux et immeubles',
        'home',
        true
    )
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 4. 7 Services Spécialisés
INSERT INTO public.services (id, category_id, name, description, base_price, estimated_duration_minutes, is_active)
VALUES 
    -- Domaine Terrain
    (
        '22222222-2222-2222-2222-222222222241',
        '11111111-1111-1111-1111-111111111114',
        'Visite & Constat Visuel Terrain',
        'Repérage sur site, conformité de l accès routier, topographie visible, environnement immédiat et prises de vues panoramiques.',
        9000,
        90,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222242',
        '11111111-1111-1111-1111-111111111114',
        'Inspection Technique & Viabilisation Terrain',
        'Examen des bornes apparentes, mitoyennetés, présence effective des réseaux à proximité (ADE, Sonelgaz, gaz, assainissement) et relief du sol.',
        14000,
        120,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222243',
        '11111111-1111-1111-1111-111111111114',
        'Audit Foncier & Rapprochement Documentaire',
        'Examen technique approfondi : confrontation visuelle des limites avec les documents déclarés (plan cadastral, livret foncier) et servitudes apparentes.',
        22000,
        180,
        true
    ),
    -- Domaine Immobilier Bâti
    (
        '22222222-2222-2222-2222-222222222251',
        '11111111-1111-1111-1111-111111111115',
        'Visite & Diagnostic Visuel Appartement',
        'Examen de l état général des pièces, menuiseries, traces d humidité/infiltrations, plafonds, plomberie apparente, électricité et parties communes.',
        10000,
        90,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222252',
        '11111111-1111-1111-1111-111111111115',
        'Inspection Complète Villa / Maison Individuelle',
        'Diagnostic complet : gros œuvre apparent (fissures), façades, étanchéité toiture/terrasse, assainissement, électricité, clôtures et extérieurs.',
        18000,
        150,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222253',
        '11111111-1111-1111-1111-111111111115',
        'Inspection Local Commercial & Bureaux',
        'Contrôle adapté à l activité : visibilité, accès commercial/PMR, hauteur sous plafond, alimentation électrique, ventilation, issues et rideaux.',
        15000,
        120,
        true
    ),
    (
        '22222222-2222-2222-2222-222222222254',
        '11111111-1111-1111-1111-111111111115',
        'Inspection Immeuble & Copropriété R+',
        'Supervision d ensemble : structure béton armé visible, cage d escalier, paliers, sous-sol/parking, toiture-terrasse collective et gaines techniques.',
        35000,
        240,
        true
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    base_price = EXCLUDED.base_price,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes;

-- 5. Template d'Inspection Terrain
INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333341',
    '22222222-2222-2222-2222-222222222242',
    'Grille d inspection Terrain & Foncier v1.0',
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- Sections d'Inspection Terrain
INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES 
    ('44444444-4444-4444-4444-444444444801', '33333333-3333-3333-3333-333333333341', 'Accès, Voirie & Desserte', 1),
    ('44444444-4444-4444-4444-444444444802', '33333333-3333-3333-3333-333333333341', 'Topographie, Relief & Sol', 2),
    ('44444444-4444-4444-4444-444444444803', '33333333-3333-3333-3333-333333333341', 'Bornage, Limites & Clôtures', 3),
    ('44444444-4444-4444-4444-444444444804', '33333333-3333-3333-3333-333333333341', 'Réseaux & Viabilisation Apparente', 4),
    ('44444444-4444-4444-4444-444444444805', '33333333-3333-3333-3333-333333333341', 'Environnement, Nuisances & Voisinage', 5),
    ('44444444-4444-4444-4444-444444444806', '33333333-3333-3333-3333-333333333341', 'Concordance Documentaire Déclarée', 6)
ON CONFLICT (id) DO NOTHING;

-- Items de Checklist Terrain (Pondérés)
INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    -- Section 1: Accès & Voirie
    ('55555555-5555-5555-5555-000000000901', '44444444-4444-4444-4444-444444444801', 'Voie d accès carrossable et praticable toute saison', 'Revêtement de la voie menant à la parcelle (goudron, tuf, piste)', 3, true, 1),
    ('55555555-5555-5555-5555-000000000902', '44444444-4444-4444-4444-444444444801', 'Largeur de desserte et servitudes de passage apparentes', 'Vérification de l absence d enclavement apparent ou passage litigieux', 4, true, 2),

    -- Section 2: Topographie & Sol
    ('55555555-5555-5555-5555-000000000903', '44444444-4444-4444-4444-444444444802', 'Assiette du terrain et déclivité (pente apparente)', 'Constat de la planéité ou de la pente nécessitant un terrassement', 3, true, 1),
    ('55555555-5555-5555-5555-000000000904', '44444444-4444-4444-4444-444444444802', 'Nature apparente du sol et écoulement des eaux pluviales', 'Présence de roches affleurantes, terre végétale, remblai ou zone inondable', 3, true, 2),

    -- Section 3: Bornage & Limites
    ('55555555-5555-5555-5555-000000000905', '44444444-4444-4444-4444-444444444803', 'Présence et intégrité des bornes géomètres apparentes', 'Recherche des bornes en béton ou repères physiques délimitant la parcelle', 4, true, 1),
    ('55555555-5555-5555-5555-000000000906', '44444444-4444-4444-4444-444444444803', 'Clôtures existantes et mitoyennetés visibles', 'Constat des murs de clôture, grillages ou haies séparatives', 2, true, 2),

    -- Section 4: Réseaux & Viabilisation
    ('55555555-5555-5555-5555-000000000907', '44444444-4444-4444-4444-444444444804', 'Réseau d eau potable ADE ou point d eau à proximité', 'Présence de conduite publique, bouche d eau ou compteur à proximité', 3, true, 1),
    ('55555555-5555-5555-5555-000000000908', '44444444-4444-4444-4444-444444444804', 'Réseau électrique Sonelgaz (poteau / transformateur visible)', 'Distance estimée du point de raccordement électrique basse tension', 3, true, 2),
    ('55555555-5555-5555-5555-000000000909', '44444444-4444-4444-4444-444444444804', 'Réseau de gaz naturel et réseau d assainissement public', 'Présence de réseau d égout public ou nécessité de fosse septique', 2, true, 3),

    -- Section 5: Environnement & Nuisances
    ('55555555-5555-5555-5555-000000000910', '44444444-4444-4444-4444-444444444805', 'Environnement immédiat, voisinage et constructions mitoyennes', 'Nature des constructions avoisinantes et activité du quartier', 2, true, 1),
    ('55555555-5555-5555-5555-000000000911', '44444444-4444-4444-4444-444444444805', 'Absence de nuisances majeures (lignes HT, oued, décharge, bruits)', 'Vérification de l absence de contrainte technique ou naturelle limitante', 3, true, 2),

    -- Section 6: Concordance Documentaire
    ('55555555-5555-5555-5555-000000000912', '44444444-4444-4444-4444-444444444806', 'Concordance visuelle entre la parcelle et le plan cadastral déclaré', 'Vérification de forme et d orientation globale selon les documents remis', 4, true, 1)
ON CONFLICT (id) DO NOTHING;

-- 6. Template d'Inspection Immobilier Bâti
INSERT INTO public.inspection_templates (id, service_id, title, version, is_active)
VALUES (
    '33333333-3333-3333-3333-333333333351',
    '22222222-2222-2222-2222-222222222252',
    'Grille d inspection Immobilier Bâti v1.0',
    1,
    true
) ON CONFLICT (id) DO NOTHING;

-- Sections d'Inspection Immobilier Bâti
INSERT INTO public.inspection_sections (id, template_id, title, order_index)
VALUES 
    ('44444444-4444-4444-4444-444444444901', '33333333-3333-3333-3333-333333333351', 'Structure & Gros Œuvre Apparent', 1),
    ('44444444-4444-4444-4444-444444444902', '33333333-3333-3333-3333-333333333351', 'Toiture, Terrasse & Étanchéité', 2),
    ('44444444-4444-4444-4444-444444444903', '33333333-3333-3333-3333-333333333351', 'Menuiseries, Ouvertures & Vitrage', 3),
    ('44444444-4444-4444-4444-444444444904', '33333333-3333-3333-3333-333333333351', 'Installation Électrique Apparente', 4),
    ('44444444-4444-4444-4444-444444444905', '33333333-3333-3333-3333-333333333351', 'Plomberie, Sanitaires & Pièces d Eau', 5),
    ('44444444-4444-4444-4444-444444444906', '33333333-3333-3333-3333-333333333351', 'Revêtements, Murs & Plafonds', 6),
    ('44444444-4444-4444-4444-444444444907', '33333333-3333-3333-3333-333333333351', 'Chauffage, Aération & Climatisation', 7),
    ('44444444-4444-4444-4444-444444444908', '33333333-3333-3333-3333-333333333351', 'Parties Communes, Façades & Dépendances', 8)
ON CONFLICT (id) DO NOTHING;

-- Items de Checklist Immobilier Bâti (Pondérés)
INSERT INTO public.inspection_items (id, section_id, name, description, weight, is_required, order_index)
VALUES
    -- Section 1: Structure & Gros Œuvre
    ('55555555-5555-5555-5555-000000001001', '44444444-4444-4444-4444-444444444901', 'Absence de fissures structurelles ou traversantes sur porteurs', 'Contrôle visuel des poteaux, poutres, linteaux et dalles', 5, true, 1),
    ('55555555-5555-5555-5555-000000001002', '44444444-4444-4444-4444-444444444901', 'Stabilité et rectitude des façades extérieures et acrotères', 'Vérification de l absence de déformation, fléchissement ou bombement', 4, true, 2),

    -- Section 2: Toiture & Étanchéité
    ('55555555-5555-5555-5555-000000001003', '44444444-4444-4444-4444-444444444902', 'Étanchéité de la toiture/terrasse et absence d infiltrations', 'Contrôle de la membrane bitumineuse, chape, solins et traces au plafond', 4, true, 1),
    ('55555555-5555-5555-5555-000000001004', '44444444-4444-4444-4444-444444444902', 'Descentes pluviales, chéneaux et évacuation des eaux de pluie', 'Vérification de l écoulement et absence de stagnation sur terrasse', 3, true, 2),

    -- Section 3: Menuiseries
    ('55555555-5555-5555-5555-000000001005', '44444444-4444-4444-4444-444444444903', 'Portes d entrée et de communication fonctionnelles', 'Contrôle du verrouillage, aplomb et absence de frottement', 2, true, 1),
    ('55555555-5555-5555-5555-000000001006', '44444444-4444-4444-4444-444444444903', 'Fenêtres, vitrage et volets roulants opérationnels', 'Ouverture, fermeture, étanchéité au vent et mécanismes de volet', 2, true, 2),

    -- Section 4: Électricité
    ('55555555-5555-5555-5555-000000001007', '44444444-4444-4444-4444-444444444904', 'Tableau électrique principal, disjoncteurs et différentiel', 'Vérification de la présence de disjoncteur général et subdivision des circuits', 4, true, 1),
    ('55555555-5555-5555-5555-000000001008', '44444444-4444-4444-4444-444444444904', 'Prises de courant, interrupteurs et mise à la terre visible', 'Vérification de l absence de fils volants ou prises arrachées', 3, true, 2),

    -- Section 5: Plomberie & Sanitaires
    ('55555555-5555-5555-5555-000000001009', '44444444-4444-4444-4444-444444444905', 'Robinetterie, pression d eau et absence de fuite visible', 'Contrôle des arrivées d eau, vannes d arrêt et mélangeurs', 3, true, 1),
    ('55555555-5555-5555-5555-000000001010', '44444444-4444-4444-4444-444444444905', 'Évacuations des eaux usées (siphons, WC, tuyaux de vidange)', 'Vérification de l écoulement rapide sans refoulement ni odeur', 3, true, 2),

    -- Section 6: Revêtements
    ('55555555-5555-5555-5555-000000001011', '44444444-4444-4444-4444-444444444906', 'Murs et plafonds : absence d humidité, moisissure ou salpêtre', 'Examen visuel des zones sensibles (angles, bas de mur, sous fenêtres)', 3, true, 1),
    ('55555555-5555-5555-5555-000000001012', '44444444-4444-4444-4444-444444444906', 'Revêtements de sol (carrelage, faïence, parquet) sans décollement', 'Vérification du calage et de l intégrité des carreaux', 2, true, 2),

    -- Section 7: Chauffage & Aération
    ('55555555-5555-5555-5555-000000001013', '44444444-4444-4444-4444-444444444907', 'Aération naturelle des pièces et ventilation des pièces humides', 'Vérification de la présence de grilles d aération et fenêtres fonctionnelles', 2, true, 1),
    ('55555555-5555-5555-5555-000000001014', '44444444-4444-4444-4444-444444444907', 'Évacuation des gaz brûlés (chauffe-eau/chaudière conforme)', 'Présence de conduit d évacuation vers l extérieur sécurisé', 4, true, 2),

    -- Section 8: Parties Communes
    ('55555555-5555-5555-5555-000000001015', '44444444-4444-4444-4444-444444444908', 'État de la cage d escalier, rampe, paliers et éclairage commun', 'Contrôle de sécurité et d entretien des parties communes', 2, true, 1),
    ('55555555-5555-5555-5555-000000001016', '44444444-4444-4444-4444-444444444908', 'Ascenseur, interphone et porte d entrée de l immeuble', 'Vérification du fonctionnement des équipements collectifs', 2, true, 2)
ON CONFLICT (id) DO NOTHING;
