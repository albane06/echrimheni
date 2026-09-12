-- ==============================================================================
-- ECHRIMHENI MVP v1.0 - Core PostgreSQL Schema
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('BUYER', 'EXPERT', 'ADMIN')) DEFAULT 'BUYER',
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Expert Profiles
CREATE TABLE IF NOT EXISTS public.expert_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    bio TEXT,
    wilaya TEXT NOT NULL,
    commune TEXT NOT NULL,
    specialties TEXT[] NOT NULL DEFAULT '{"automobile"}',
    hourly_rate INTEGER DEFAULT 3000,
    fixed_rate INTEGER DEFAULT 7000,
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    rating_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Expert Documents (Private & Admin Audited)
CREATE TABLE IF NOT EXISTS public.expert_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id UUID NOT NULL REFERENCES public.expert_profiles(id) ON DELETE CASCADE,
    identity_document_url TEXT NOT NULL,
    identity_document_type TEXT NOT NULL DEFAULT 'CNI',
    identity_document_number TEXT NOT NULL,
    business_registration_url TEXT NOT NULL,
    business_registration_number TEXT NOT NULL,
    business_name TEXT NOT NULL,
    business_activity TEXT NOT NULL,
    verification_status TEXT NOT NULL CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')) DEFAULT 'PENDING',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_expert_document UNIQUE (expert_id)
);

-- 4. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Services
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price INTEGER NOT NULL DEFAULT 7000,
    estimated_duration_minutes INTEGER NOT NULL DEFAULT 60,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Inspection Templates
CREATE TABLE IF NOT EXISTS public.inspection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Inspection Sections
CREATE TABLE IF NOT EXISTS public.inspection_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.inspection_templates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Inspection Items
CREATE TABLE IF NOT EXISTS public.inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES public.inspection_sections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    weight INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT true,
    order_index INTEGER NOT NULL DEFAULT 0,
    possible_statuses TEXT[] NOT NULL DEFAULT '{"BON", "MOYEN", "MAUVAIS", "NON_TESTE"}',
    possible_severities TEXT[] NOT NULL DEFAULT '{"INFO", "FAIBLE", "MOYEN", "IMPORTANT", "CRITIQUE"}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Listings (Inspection Requests)
CREATE TABLE IF NOT EXISTS public.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id),
    title TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    mileage INTEGER,
    asking_price INTEGER,
    location_wilaya TEXT NOT NULL,
    location_commune TEXT NOT NULL,
    description TEXT,
    photos TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expert_id UUID REFERENCES public.expert_profiles(id),
    service_id UUID NOT NULL REFERENCES public.services(id),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
        'DRAFT', 'PUBLISHED', 'BOOKING_REQUESTED', 'ACCEPTED', 
        'PAYMENT_PENDING', 'PAID', 'SCHEDULED', 'IN_PROGRESS', 
        'INSPECTION_COMPLETED', 'REPORT_PENDING', 'REPORT_READY', 
        'COMPLETED', 'CANCELLED', 'DISPUTED', 'REJECTED', 'EXPIRED'
    )),
    scheduled_at TIMESTAMPTZ,
    location_address TEXT NOT NULL,
    price_total INTEGER NOT NULL DEFAULT 0,
    commission_platform INTEGER NOT NULL DEFAULT 0,
    expert_payout INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Inspection Sessions
CREATE TABLE IF NOT EXISTS public.inspection_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
    expert_id UUID NOT NULL REFERENCES public.expert_profiles(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

-- 12. Inspection Answers
CREATE TABLE IF NOT EXISTS public.inspection_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inspection_items(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('BON', 'MOYEN', 'MAUVAIS', 'NON_TESTE')),
    severity TEXT CHECK (severity IN ('INFO', 'FAIBLE', 'MOYEN', 'IMPORTANT', 'CRITIQUE')),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_session_item UNIQUE (session_id, item_id)
);

-- 13. Inspection Media
CREATE TABLE IF NOT EXISTS public.inspection_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inspection_items(id) ON DELETE SET NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL DEFAULT 'IMAGE' CHECK (media_type IN ('IMAGE', 'VIDEO')),
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Reports
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE UNIQUE,
    session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE UNIQUE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    summary TEXT NOT NULL,
    positive_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    watchpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
    major_defects JSONB NOT NULL DEFAULT '[]'::jsonb,
    critical_defects JSONB NOT NULL DEFAULT '[]'::jsonb,
    disclaimer TEXT NOT NULL,
    pdf_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'DZD',
    method TEXT NOT NULL DEFAULT 'SANDBOX' CHECK (method IN ('SANDBOX', 'CASH')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED')),
    transaction_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 17. Admin Actions (Audit Log)
CREATE TABLE IF NOT EXISTS public.admin_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_buyer ON public.listings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_buyer ON public.bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_expert ON public.bookings(expert_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_inspection_answers_session ON public.inspection_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_expert_documents_status ON public.expert_documents(verification_status);
