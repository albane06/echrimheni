-- ==============================================================================
-- ECHRIMHENI MVP v1.0 - Row Level Security (RLS) & Security Functions
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = user_id AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are readable by authenticated users"
ON public.profiles FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile except role"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
    auth.uid() = id AND 
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 2. Expert Profiles Policies
CREATE POLICY "Public can view approved experts"
ON public.expert_profiles FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.expert_documents
        WHERE expert_id = public.expert_profiles.id AND verification_status = 'APPROVED'
    )
    OR auth.uid() = id
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Experts can manage their own expert profile"
ON public.expert_profiles FOR ALL
USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- 3. Expert Documents (STRICT PRIVACY)
CREATE POLICY "Experts can view and create their own documents"
ON public.expert_documents FOR SELECT
USING (expert_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Experts can insert their initial documents"
ON public.expert_documents FOR INSERT
WITH CHECK (expert_id = auth.uid());

CREATE POLICY "Only admins can update verification status"
ON public.expert_documents FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Public Categories & Templates
CREATE POLICY "Categories are readable by everyone"
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Services are readable by everyone"
ON public.services FOR SELECT USING (true);

CREATE POLICY "Templates and items are readable by everyone"
ON public.inspection_templates FOR SELECT USING (true);

CREATE POLICY "Sections are readable by everyone"
ON public.inspection_sections FOR SELECT USING (true);

CREATE POLICY "Items are readable by everyone"
ON public.inspection_items FOR SELECT USING (true);

-- 5. Listings Policies
CREATE POLICY "Buyers can view and manage their own listings"
ON public.listings FOR ALL
USING (buyer_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Approved experts can view active listings"
ON public.listings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.expert_documents
        WHERE expert_id = auth.uid() AND verification_status = 'APPROVED'
    )
);

-- 6. Bookings Policies
CREATE POLICY "Parties involved can view bookings"
ON public.bookings FOR SELECT
USING (
    buyer_id = auth.uid() 
    OR expert_id = auth.uid() 
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Buyers can create bookings"
ON public.bookings FOR INSERT
WITH CHECK (buyer_id = auth.uid());

-- 7. Inspection Sessions & Answers
CREATE POLICY "Assigned expert and admin can manage inspection session"
ON public.inspection_sessions FOR ALL
USING (expert_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Assigned expert and admin can manage inspection answers"
ON public.inspection_answers FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND (s.expert_id = auth.uid() OR public.is_admin(auth.uid()))
    )
);

CREATE POLICY "Assigned expert and admin can manage inspection media"
ON public.inspection_media FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND (s.expert_id = auth.uid() OR public.is_admin(auth.uid()))
    )
);

-- 8. Reports Policies
CREATE POLICY "Authorized parties can view published reports"
ON public.reports FOR SELECT
USING (
    is_published = true AND (
        EXISTS (
            SELECT 1 FROM public.bookings b 
            WHERE b.id = booking_id AND (b.buyer_id = auth.uid() OR b.expert_id = auth.uid())
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Experts can create and publish reports for their missions"
ON public.reports FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND s.expert_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

-- 9. Payments Policies
CREATE POLICY "Buyers can view their payments"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.buyer_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

-- 10. Admin Actions Audit
CREATE POLICY "Only admins can view and write audit logs"
ON public.admin_actions FOR ALL
USING (public.is_admin(auth.uid()));
