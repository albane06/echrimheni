import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { ensureReportPdf, ReportPdfAccessError } from '@echrimheni/database';

/**
 * P6.2-A — Génération/accès serveur du PDF d'un rapport (SERVER ONLY).
 * Le service_role ne quitte jamais le serveur : seul un signed URL est renvoyé.
 * Autorisation : ADMIN, ou buyer/expert partie prenante du booking.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    if (!reportId) {
      return NextResponse.json({ error: 'Rapport requis.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Configuration Supabase manquante.' }, { status: 500 });
    }

    // Session navigateur via cookies (aucun secret exposé).
    const cookieStore = await cookies();
    const supabaseRef = new URL(supabaseUrl).hostname.split('.')[0];
    const sessionCookie = cookieStore.get(`sb-${supabaseRef}-auth-token`)?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Session requise.' }, { status: 401 });
    }

    let accessToken: string;
    try {
      const parsed = JSON.parse(sessionCookie);
      accessToken = Array.isArray(parsed) ? parsed[0] : parsed.access_token;
    } catch {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
    }
    const userId = userData.user.id;

    // Le service applique à nouveau l'autorisation et l'état de publication
    // avec le service_role : la route ne constitue jamais la seule barrière.
    const { getSupabaseAdminClient } = await import('@echrimheni/database/client');
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single();
    const { signedUrl } = await ensureReportPdf(reportId, {
      userId,
      role: (profile as any)?.role || null
    });
    if (!signedUrl) {
      return NextResponse.json({ error: 'Lien PDF indisponible.' }, { status: 500 });
    }
    return NextResponse.json({ signedUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne.';
    if (err instanceof ReportPdfAccessError) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    if (/service_role|SERVER ONLY/i.test(message)) {
      return NextResponse.json({ error: 'Configuration serveur requise.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
