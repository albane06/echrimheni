import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * P6.4-A — Déclenchement manuel de l'expiration des BOOKING_REQUESTED
 * périmées (SERVER ONLY, ADMIN uniquement).
 * Le service_role ne quitte jamais le serveur : seul le résumé JSON du job
 * est renvoyé. Le mobile n'appelle jamais cette route avec un autre rôle.
 */
export async function POST() {
  try {
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

    // La fonction SQL vérifie elle-même (service_role / admin / postgres) :
    // la route ne constitue jamais la seule barrière.
    const { getSupabaseAdminClient } = await import('@echrimheni/database/client');
    const admin = getSupabaseAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userData.user.id).single();
    if ((profile as any)?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs.' }, { status: 403 });
    }

    const { data, error } = await admin.rpc('expire_stale_booking_requests', {
      p_max_age: '72 hours',
      p_limit: 100
    });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne.';
    if (/service_role|SERVER ONLY/i.test(message)) {
      return NextResponse.json({ error: 'Configuration serveur requise.' }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
