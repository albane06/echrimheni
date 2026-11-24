import { getSupabaseClient } from '../client.js';

export async function getAdminKPIs() {
  const supabase = getSupabaseClient();
  
  const [
    { count: totalUsers },
    { count: pendingExperts },
    { count: approvedExperts },
    { count: activeMissions },
    { count: completedMissions },
    { data: payments }
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('expert_documents').select('*', { count: 'exact', head: true }).eq('verification_status', 'PENDING'),
    supabase.from('expert_documents').select('*', { count: 'exact', head: true }).eq('verification_status', 'APPROVED'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).in('status', ['SCHEDULED', 'IN_PROGRESS']),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETED'),
    supabase.from('payments').select('amount').eq('status', 'PAID')
  ]);

  const totalRevenue = (payments || []).reduce((sum, p: any) => sum + (p.amount || 0), 0);
  const totalCommission = Math.round(totalRevenue * 0.15);

  return {
    totalUsers: totalUsers || 0,
    pendingExperts: pendingExperts || 0,
    approvedExperts: approvedExperts || 0,
    activeMissions: activeMissions || 0,
    completedMissions: completedMissions || 0,
    totalCommission
  };
}

export async function getPendingExperts() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expert_documents')
    .select('*, profiles!inner(full_name, phone), expert_profiles!inner(wilaya, commune, specialties)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * P2 — Lecture admin des experts basée sur profiles + expert_profiles,
 * avec documents joints de façon optionnelle.
 *
 * Un expert existant sans document apparaît avec verification_status = 'PENDING'.
 * Aucune écriture, aucun document artificiel créé.
 */
export async function getExpertsAdmin() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('expert_profiles')
    .select('*, profiles!inner(id, full_name, phone, created_at), expert_documents(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row: any) => {
    const embedded = row.expert_documents;
    const doc = Array.isArray(embedded) ? embedded[0] || null : embedded || null;
    return {
      expert_id: row.id,
      id: row.id,
      created_at: row.created_at,
      verification_status: doc?.verification_status || 'PENDING',
      rejection_reason: doc?.rejection_reason || null,
      identity_document_type: doc?.identity_document_type || null,
      identity_document_number: doc?.identity_document_number || null,
      business_name: doc?.business_name || null,
      business_registration_number: doc?.business_registration_number || null,
      business_activity: doc?.business_activity || null,
      profiles: row.profiles,
      expert_profiles: {
        wilaya: row.wilaya,
        commune: row.commune,
        specialties: row.specialties || []
      }
    };
  });
}

export async function verifyExpertDossier(expertId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED', rejectionReason?: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('admin_verify_expert_rpc', {
    p_expert_id: expertId,
    p_status: status,
    p_rejection_reason: rejectionReason || null
  });

  if (error) throw error;
  return data;
}

export async function getAuditLogs() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('admin_actions')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function getAllMissions() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      listings(
        id,
        title,
        make,
        model,
        year,
        location_wilaya,
        location_commune,
        listing_url,
        source_platform,
        category_id,
        categories(code, name),
        listing_real_estate(*)
      ),
      services(id, name, base_price, category_id),
      buyer:profiles!buyer_id(full_name),
      expert:expert_profiles!expert_id(profiles(full_name)),
      reports(score, is_published)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * P6.4-C — Traçage d'une résolution de litige (session ADMIN : la RLS
 * admin_actions autorise l'écriture ; best-effort, jamais bloquant pour
 * la résolution elle-même qui reste l'acte autoritatif via RPC).
 */
export async function logDisputeResolution(params: {
  bookingId: string;
  resolution: 'COMPLETED' | 'CANCELLED';
  reason?: string | null;
}): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Non authentifié.');
  const { error } = await supabase.from('admin_actions').insert({
    admin_id: session.user.id,
    action_type: params.resolution === 'COMPLETED' ? 'DISPUTE_RESOLVED_COMPLETED' : 'DISPUTE_RESOLVED_CANCELLED',
    target_type: 'bookings',
    target_id: params.bookingId,
    details: { reason: params.reason || null, resolved_at: new Date().toISOString() }
  });
  if (error) throw error;
}

// ============================================================
// REPORTS
// ============================================================

export async function getAllReports() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      bookings!inner(
        id, status, price_total, commission_platform, expert_payout, created_at,
        listings(
          id,
          title,
          make,
          model,
          year,
          location_wilaya,
          location_commune,
          category_id,
          categories(code, name),
          listing_real_estate(*)
        ),
        services(id, name, base_price),
        buyer:profiles!buyer_id(full_name),
        expert:expert_profiles!expert_id(profiles(full_name))
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getReportById(reportId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('reports')
    .select(`
      *,
      bookings!inner(
        id, status, price_total, location_address, created_at,
        listings(title, make, model, year, location_wilaya),
        buyer:profiles!buyer_id(full_name),
        expert:expert_profiles!expert_id(profiles(full_name, phone), wilaya)
      ),
      inspection_sessions!inner(
        id, expert_id, started_at, completed_at
      )
    `)
    .eq('id', reportId)
    .single();

  if (error) throw error;
  return data;
}

export async function getReportMedia(sessionId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('inspection_media')
    .select('id, media_url, media_type, caption, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Generate signed URLs for private storage access
  const mediaWithUrls = await Promise.all(
    (data || []).map(async (m: any) => {
      if (m.media_url && m.media_url.startsWith('inspection-media/')) {
        const { data: signedData } = await supabase.storage
          .from('inspection-media')
          .createSignedUrl(m.media_url.replace('inspection-media/', ''), 3600);
        return { ...m, signed_url: signedData?.signedUrl || null };
      }
      return { ...m, signed_url: m.media_url };
    })
  );

  return mediaWithUrls;
}

// ============================================================
// PAYMENTS
// ============================================================

export async function getAllPayments() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      bookings!inner(
        id, price_total, commission_platform, expert_payout,
        listings(title, make, model, year),
        buyer:profiles!buyer_id(full_name),
        expert:expert_profiles!expert_id(profiles(full_name))
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPaymentKPIs() {
  const supabase = getSupabaseClient();

  const [
    { data: paidPayments },
    { count: pendingCount }
  ] = await Promise.all([
    supabase.from('payments').select('amount').eq('status', 'PAID'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
  ]);

  const totalRevenue = (paidPayments || []).reduce((sum, p: any) => sum + (p.amount || 0), 0);
  const totalCommission = Math.round(totalRevenue * 0.15);
  const totalExpertPayout = totalRevenue - totalCommission;

  return {
    totalRevenue,
    totalCommission,
    totalExpertPayout,
    pendingCount: pendingCount || 0
  };
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function getAdminNotifications() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Non authentifié.');

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Non authentifié.');

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', session.user.id)
    .is('read_at', null);

  if (error) throw error;
}
