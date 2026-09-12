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
    .select('*, listings(title, make, model, year, location_wilaya), buyer:profiles!buyer_id(full_name), expert:expert_profiles!expert_id(profiles(full_name)), reports(score, is_published)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
