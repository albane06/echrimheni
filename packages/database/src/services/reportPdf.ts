import { getSupabaseAdminClient, getSupabaseClient } from '../client.js';
import { generateInspectionPdf, type ReportPdfData } from './pdf.js';
import { requireSessionUserId } from './buyer.js';

export const REPORTS_BUCKET = 'reports';

export class ReportPdfAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportPdfAccessError';
  }
}

export function buildCanonicalReportPdfUrl(bookingId: string, reportId: string): string {
  return `${REPORTS_BUCKET}/${bookingId}/${reportId}.pdf`;
}

export function assertReportPdfAvailable(report: {
  id: string;
  booking_id: string;
  is_published: boolean;
  pdf_url?: string | null;
  bookings?: { buyer_id: string; expert_id: string | null; status: string } | null;
}, callerId: string, callerRole?: string | null): string {
  const booking = report.bookings;
  if (!booking) throw new ReportPdfAccessError('Rapport sans réservation associée.');
  if (callerRole !== 'ADMIN' && booking.buyer_id !== callerId && booking.expert_id !== callerId) {
    throw new ReportPdfAccessError('Accès refusé à ce rapport.');
  }
  if (booking.status !== 'REPORT_READY' || !report.is_published) {
    throw new ReportPdfAccessError('Rapport non disponible.');
  }

  const canonicalUrl = buildCanonicalReportPdfUrl(report.booking_id, report.id);
  if (report.pdf_url && report.pdf_url !== canonicalUrl) {
    throw new ReportPdfAccessError('Chemin PDF du rapport incohérent.');
  }
  return canonicalUrl;
}

/**
 * P6.2-A — URL signée d'un PDF de rapport (session requise, RLS du bucket).
 */
export async function getReportPdfSignedUrl(pdfUrl: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  await requireSessionUserId();
  if (!pdfUrl.startsWith(`${REPORTS_BUCKET}/`)) {
    throw new Error('URL de rapport invalide.');
  }
  const path = pdfUrl.slice(REPORTS_BUCKET.length + 1);
  const { data, error } = await supabase.storage.from(REPORTS_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data?.signedUrl || null;
}

/**
 * P6.2-A — Construction des données PDF depuis un rapport persisté (pur,
 * testable). Aucune donnée hardcodée : tout vient du rapport stocké.
 */
export function buildReportPdfData(report: any): ReportPdfData {
  const booking = report.bookings || {};
  const listing = booking.listings || {};
  const expertName =
    booking?.expert?.profiles?.full_name || booking?.expert?.full_name || 'Expert';
  const answers: any[] = Array.isArray(report.answers) ? report.answers : [];

  return {
    reportNumber: `RPT-${String(report.id || '').slice(0, 8).toUpperCase()}`,
    date: report.published_at
      ? new Date(report.published_at).toLocaleDateString('fr-FR')
      : new Date(report.created_at).toLocaleDateString('fr-FR'),
    score: report.score,
    vehicle: {
      make: listing.make || '',
      model: listing.model || listing.title || '',
      year: listing.year || new Date().getFullYear(),
      mileage: listing.mileage,
      askingPrice: listing.asking_price,
      location: listing.location_wilaya || ''
    },
    expert: {
      fullName: expertName,
      phone: '',
      wilaya: ''
    },
    sections: [],
    positivePoints: report.positive_points || [],
    watchpoints: report.watchpoints || [],
    majorDefects: report.major_defects || [],
    criticalDefects: report.critical_defects || [],
    summary: report.summary,
    ...(answers.length > 0
      ? {
          sections: [
            {
              title: 'Observations relevées',
              items: answers.map((a: any) => ({
                name: a.item_name || 'Point de contrôle',
                status: a.status,
                comment: a.comment
              }))
            }
          ]
        }
      : {})
  };
}

/**
 * P6.2-A — Génération + stockage serveur du PDF d'un rapport REPORT_READY.
 * SERVER ONLY (service_role). Idempotent : réutilise le PDF existant.
 * Ne modifie jamais le contenu du rapport (immutabilité préservée).
 */
export async function ensureReportPdf(
  reportId: string,
  caller: { userId: string; role?: string | null }
): Promise<{ pdfUrl: string; signedUrl: string | null }> {
  const supabase = getSupabaseAdminClient();

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select(
      '*, bookings!inner(id, buyer_id, expert_id, status, listings(title, make, model, year, mileage, asking_price, location_wilaya), expert:expert_profiles!expert_id(profiles(full_name)))'
    )
    .eq('id', reportId)
    .single();
  if (reportError || !report) {
    throw new Error('Rapport introuvable.');
  }

  const canonicalUrl = assertReportPdfAvailable(report as any, caller.userId, caller.role);
  const existingUrl: string | null = (report as any).pdf_url || null;
  if (existingUrl) {
    const existingPath = canonicalUrl.slice(REPORTS_BUCKET.length + 1);
    const { data: signed } = await supabase.storage
      .from(REPORTS_BUCKET)
      .createSignedUrl(existingPath, 3600);
    return { pdfUrl: canonicalUrl, signedUrl: signed?.signedUrl || null };
  }

  const { data: answers } = await supabase
    .from('inspection_answers')
    .select('status, comment, inspection_items(name)')
    .eq('session_id', (report as any).session_id);
  const pdfData = buildReportPdfData({
    ...(report as object),
    answers: (answers || []).map((a: any) => ({
      status: a.status,
      comment: a.comment,
      item_name: a.inspection_items?.name
    }))
  });

  const buffer = await generateInspectionPdf(pdfData);
  const path = canonicalUrl.slice(REPORTS_BUCKET.length + 1);
  const { error: uploadError } = await supabase.storage
    .from(REPORTS_BUCKET)
    .upload(path, buffer, { contentType: 'application/pdf', upsert: false });
  if (uploadError) throw uploadError;

  const pdfUrl = canonicalUrl;
  const { error: updateError } = await supabase
    .from('reports')
    .update({ pdf_url: pdfUrl })
    .eq('id', reportId);
  if (updateError) throw updateError;

  const { data: signed } = await supabase.storage.from(REPORTS_BUCKET).createSignedUrl(path, 3600);
  return { pdfUrl, signedUrl: signed?.signedUrl || null };
}
