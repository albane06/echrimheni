-- ==============================================================================
-- ECHRIMHENI SPRINT 2 - Production Hardening, Security, RLS & Storage
-- ==============================================================================

-- 1. FIX V-01: Admin Privilege Escalation & Secure Profile Creation
-- Authenticated users cannot directly promote themselves to ADMIN.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS 
DECLARE
    v_role text;
    v_full_name text;
    v_phone text;
BEGIN
    -- Extract role from metadata, but strictly disallow client-supplied ADMIN
    v_role := COALESCE(new.raw_user_meta_data->>'role', 'BUYER');
    IF v_role NOT IN ('BUYER', 'EXPERT') THEN
        v_role := 'BUYER';
    END IF;

    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', 'Utilisateur');
    v_phone := COALESCE(new.raw_user_meta_data->>'phone', '');

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (new.id, v_role, v_full_name, v_phone)
    ON CONFLICT (id) DO UPDATE 
    SET full_name = EXCLUDED.full_name, phone = EXCLUDED.phone;

    -- If Expert, create initial expert profile entry
    IF v_role = 'EXPERT' THEN
        INSERT INTO public.expert_profiles (id, wilaya, commune, specialties)
        VALUES (
            new.id,
            COALESCE(new.raw_user_meta_data->>'wilaya', 'Alger'),
            COALESCE(new.raw_user_meta_data->>'commune', 'Alger-Centre'),
            ARRAY['automobile']
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN new;
END;
 LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Restrict manual INSERT on profiles
DROP POLICY IF EXISTS "Profiles insert restriction" ON public.profiles;
CREATE POLICY "Profiles insert restriction"
ON public.profiles FOR INSERT
WITH CHECK (
    auth.uid() = id AND 
    role IN ('BUYER', 'EXPERT')
);

-- Secure Admin Promotion Function (callable only by existing Admin or Service Role)
CREATE OR REPLACE FUNCTION public.promote_user_to_admin(p_user_id uuid)
RETURNS void AS 
BEGIN
    IF NOT public.is_admin(auth.uid()) AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Non autorisé : seul un administrateur peut promouvoir un utilisateur.';
    END IF;

    UPDATE public.profiles
    SET role = 'ADMIN', updated_at = now()
    WHERE id = p_user_id;

    INSERT INTO public.admin_actions (admin_id, action_type, target_type, target_id, details)
    VALUES (
        COALESCE(auth.uid(), p_user_id),
        'USER_PROMOTED_TO_ADMIN',
        'profiles',
        p_user_id,
        jsonb_build_object('promoted_at', now())
    );
END;
 LANGUAGE plpgsql SECURITY DEFINER;


-- 2. FIX V-02: Booking Security & State Machine Server-Side Enforcement
DROP POLICY IF EXISTS "Buyers can create bookings" ON public.bookings;
CREATE POLICY "Buyers can create bookings securely"
ON public.bookings FOR INSERT
WITH CHECK (
    buyer_id = auth.uid() AND
    status IN ('DRAFT', 'BOOKING_REQUESTED') AND
    price_total >= 0 AND
    commission_platform >= 0 AND
    expert_payout >= 0
);

DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
CREATE POLICY "Bookings update policy"
ON public.bookings FOR UPDATE
USING (
    buyer_id = auth.uid() OR expert_id = auth.uid() OR public.is_admin(auth.uid())
)
WITH CHECK (
    buyer_id = auth.uid() OR expert_id = auth.uid() OR public.is_admin(auth.uid())
);

-- Server-side RPC for strict booking transitions
CREATE OR REPLACE FUNCTION public.transition_booking_rpc(
    p_booking_id uuid,
    p_target_status text,
    p_notes text DEFAULT NULL
)
RETURNS jsonb AS 
DECLARE
    v_booking record;
    v_caller_id uuid := auth.uid();
    v_is_admin boolean;
    v_is_valid boolean := false;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Réservation introuvable : %', p_booking_id;
    END IF;

    v_is_admin := public.is_admin(v_caller_id);

    -- Authorization checks based on status
    IF NOT v_is_admin THEN
        IF v_booking.buyer_id != v_caller_id AND (v_booking.expert_id IS NULL OR v_booking.expert_id != v_caller_id) THEN
            RAISE EXCEPTION 'Non autorisé : vous ne faites pas partie de cette réservation.';
        END IF;

        -- Specific role permissions
        IF p_target_status IN ('ACCEPTED', 'IN_PROGRESS', 'INSPECTION_COMPLETED', 'REPORT_PENDING', 'REPORT_READY') THEN
            IF v_booking.expert_id != v_caller_id THEN
                RAISE EXCEPTION 'Action réservée à l expert assigné.';
            END IF;

            -- CRITICAL: Check expert verification status
            IF NOT EXISTS (
                SELECT 1 FROM public.expert_documents
                WHERE expert_id = v_caller_id AND verification_status = 'APPROVED'
            ) THEN
                RAISE EXCEPTION 'Action refusée : seules les candidatures d experts APPROVED peuvent accepter ou réaliser des missions.';
            END IF;
        END IF;

        IF p_target_status IN ('PUBLISHED', 'BOOKING_REQUESTED') THEN
            IF v_booking.buyer_id != v_caller_id THEN
                RAISE EXCEPTION 'Action réservée au client demandeur.';
            END IF;
        END IF;
    END IF;

    -- Validate state machine transitions
    CASE v_booking.status
        WHEN 'DRAFT' THEN
            v_is_valid := (p_target_status = 'PUBLISHED');
        WHEN 'PUBLISHED' THEN
            v_is_valid := (p_target_status = 'BOOKING_REQUESTED');
        WHEN 'BOOKING_REQUESTED' THEN
            v_is_valid := (p_target_status IN ('ACCEPTED', 'REJECTED', 'EXPIRED'));
        WHEN 'ACCEPTED' THEN
            v_is_valid := (p_target_status IN ('PAYMENT_PENDING', 'CANCELLED'));
        WHEN 'PAYMENT_PENDING' THEN
            v_is_valid := (p_target_status IN ('PAID', 'CANCELLED'));
        WHEN 'PAID' THEN
            v_is_valid := (p_target_status = 'SCHEDULED');
        WHEN 'SCHEDULED' THEN
            v_is_valid := (p_target_status IN ('IN_PROGRESS', 'CANCELLED'));
        WHEN 'IN_PROGRESS' THEN
            v_is_valid := (p_target_status = 'INSPECTION_COMPLETED');
        WHEN 'INSPECTION_COMPLETED' THEN
            v_is_valid := (p_target_status = 'REPORT_PENDING');
        WHEN 'REPORT_PENDING' THEN
            v_is_valid := (p_target_status = 'REPORT_READY');
        WHEN 'REPORT_READY' THEN
            v_is_valid := (p_target_status = 'COMPLETED');
        WHEN 'DISPUTED' THEN
            v_is_valid := (p_target_status IN ('COMPLETED', 'CANCELLED'));
        ELSE
            v_is_valid := false;
    END CASE;

    IF NOT v_is_valid THEN
        RAISE EXCEPTION 'Transition illégale rejetée par le serveur : de % vers %', v_booking.status, p_target_status;
    END IF;

    UPDATE public.bookings
    SET status = p_target_status,
        notes = COALESCE(p_notes, notes),
        updated_at = now()
    WHERE id = p_booking_id;

    -- Send in-app notification
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        CASE WHEN v_caller_id = v_booking.buyer_id AND v_booking.expert_id IS NOT NULL 
             THEN v_booking.expert_id 
             ELSE v_booking.buyer_id END,
        'BOOKING_STATUS_CHANGED',
        'Statut de réservation mis à jour',
        'La réservation est maintenant ' || p_target_status
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'previous_status', v_booking.status,
        'current_status', p_target_status
    );
END;
 LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FIX V-03: Report Immutability
DROP POLICY IF EXISTS "Experts can create and publish reports for their missions" ON public.reports;

CREATE POLICY "Experts can insert report"
ON public.reports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND s.expert_id = auth.uid()
    )
    OR public.is_admin(auth.uid())
);

CREATE POLICY "Reports cannot be modified once published"
ON public.reports FOR UPDATE
USING (
    (is_published = false AND EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND s.expert_id = auth.uid()
    ))
    OR public.is_admin(auth.uid())
)
WITH CHECK (
    (is_published = false AND EXISTS (
        SELECT 1 FROM public.inspection_sessions s
        WHERE s.id = session_id AND s.expert_id = auth.uid()
    ))
    OR public.is_admin(auth.uid())
);


-- 4. FIX V-05: Financial Integrity & Payment Idempotency
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS uq_payment_transaction_ref;
ALTER TABLE public.payments ADD CONSTRAINT uq_payment_transaction_ref UNIQUE (transaction_ref);

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS chk_payment_amount_positive;
ALTER TABLE public.payments ADD CONSTRAINT chk_payment_amount_positive CHECK (amount >= 0);

CREATE OR REPLACE FUNCTION public.process_payment_rpc(
    p_booking_id uuid,
    p_amount integer,
    p_method text,
    p_transaction_ref text
)
RETURNS jsonb AS 
DECLARE
    v_booking record;
    v_existing_payment record;
    v_commission integer;
    v_payout integer;
BEGIN
    SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Réservation non trouvée.';
    END IF;

    -- Idempotency check: if transaction ref already succeeded, return it immediately without duplicate charge
    SELECT * INTO v_existing_payment FROM public.payments WHERE transaction_ref = p_transaction_ref;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'idempotent', true,
            'payment_id', v_existing_payment.id,
            'status', v_existing_payment.status,
            'message', 'Paiement déjà enregistré (idempotent).'
        );
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Montant invalide : doit être supérieur à zéro.';
    END IF;

    -- Server-side financial calculations: 15% platform commission, 85% expert payout
    v_commission := round(p_amount * 0.15);
    v_payout := p_amount - v_commission;

    -- Insert payment record
    INSERT INTO public.payments (booking_id, amount, currency, method, status, transaction_ref)
    VALUES (p_booking_id, p_amount, 'DZD', p_method, 'PAID', p_transaction_ref);

    -- Update booking with verified financial breakdown and status
    UPDATE public.bookings
    SET price_total = p_amount,
        commission_platform = v_commission,
        expert_payout = v_payout,
        status = 'PAID',
        updated_at = now()
    WHERE id = p_booking_id;

    -- Send notification
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        v_booking.buyer_id,
        'PAYMENT_SUCCESS',
        'Paiement confirmé',
        'Votre paiement de ' || p_amount || ' DZD a été validé avec succès.'
    );

    IF v_booking.expert_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (
            v_booking.expert_id,
            'MISSION_PAID',
            'Mission rémunérée et confirmée',
            'Le paiement client pour la mission a été confirmé. Part expert : ' || v_payout || ' DZD.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'idempotent', false,
        'amount', p_amount,
        'commission', v_commission,
        'expert_payout', v_payout,
        'status', 'PAID'
    );
END;
 LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Admin Expert Verification RPC & Audit Trail
CREATE OR REPLACE FUNCTION public.admin_verify_expert_rpc(
    p_expert_id uuid,
    p_status text,
    p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb AS 
DECLARE
    v_admin_id uuid := auth.uid();
BEGIN
    IF NOT public.is_admin(v_admin_id) AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Non autorisé : rôle administrateur requis.';
    END IF;

    IF p_status NOT IN ('APPROVED', 'REJECTED', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Statut invalide : %', p_status;
    END IF;

    IF p_status = 'REJECTED' AND (p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) < 5) THEN
        RAISE EXCEPTION 'Un motif explicite d au moins 5 caractères est obligatoire pour rejeter un dossier.';
    END IF;

    UPDATE public.expert_documents
    SET verification_status = p_status,
        rejection_reason = CASE WHEN p_status = 'REJECTED' THEN p_rejection_reason ELSE NULL END,
        reviewed_by = v_admin_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE expert_id = p_expert_id;

    -- Log to admin_actions
    INSERT INTO public.admin_actions (admin_id, action_type, target_type, target_id, details)
    VALUES (
        v_admin_id,
        'EXPERT_' || p_status,
        'expert_documents',
        p_expert_id,
        jsonb_build_object(
            'new_status', p_status,
            'rejection_reason', p_rejection_reason,
            'timestamp', now()
        )
    );

    -- Notify Expert
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
        p_expert_id,
        'VERIFICATION_' || p_status,
        'Décision sur votre dossier expert',
        CASE 
            WHEN p_status = 'APPROVED' THEN 'Félicitations ! Votre dossier a été approuvé. Vous pouvez désormais recevoir des missions.'
            WHEN p_status = 'REJECTED' THEN 'Votre dossier a été refusé pour le motif suivant : ' || p_rejection_reason
            ELSE 'Votre compte expert a été temporairement suspendu.'
        END
    );

    RETURN jsonb_build_object(
        'success', true,
        'expert_id', p_expert_id,
        'status', p_status
    );
END;
 LANGUAGE plpgsql SECURITY DEFINER;


-- 6. FIX V-04: Storage Infrastructure Provisioning & Policies
-- Buckets: expert-documents (private), inspection-media (private), reports (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('expert-documents', 'expert-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
    ('inspection-media', 'inspection-media', false, 15728640, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4']),
    ('reports', 'reports', false, 20971520, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS
CREATE POLICY "Expert documents private access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'expert-documents' AND (
        (auth.uid())::text = (storage.foldername(name))[1] OR
        public.is_admin(auth.uid())
    )
);

CREATE POLICY "Experts can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'expert-documents' AND
    (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Inspection media access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'inspection-media' AND (
        EXISTS (
            SELECT 1 FROM public.inspection_media m
            JOIN public.inspection_sessions s ON s.id = m.session_id
            JOIN public.bookings b ON b.id = s.booking_id
            WHERE m.media_url LIKE '%' || name || '%' AND (
                b.buyer_id = auth.uid() OR b.expert_id = auth.uid() OR public.is_admin(auth.uid())
            )
        )
        OR public.is_admin(auth.uid())
    )
);

CREATE POLICY "Experts can upload inspection media"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'inspection-media' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Reports private access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'reports' AND (
        EXISTS (
            SELECT 1 FROM public.reports r
            JOIN public.bookings b ON b.id = r.booking_id
            WHERE r.pdf_url LIKE '%' || name || '%' AND (
                b.buyer_id = auth.uid() OR b.expert_id = auth.uid() OR public.is_admin(auth.uid())
            )
        )
        OR public.is_admin(auth.uid())
    )
);