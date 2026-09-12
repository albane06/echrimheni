import { getSupabaseClient } from '../client.js';
import { Profile, UserRole } from '@echrimheni/shared';

export async function signUpUser(params: {
  email: string;
  password: string;
  role: 'BUYER' | 'EXPERT';
  fullName: string;
  phone: string;
  wilaya?: string;
  commune?: string;
}) {
  const supabase = getSupabaseClient();
  
  // Strict check: clients can NEVER request role = 'ADMIN'
  const safeRole = params.role === 'EXPERT' ? 'EXPERT' : 'BUYER';

  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        role: safeRole,
        full_name: params.fullName,
        phone: params.phone,
        wilaya: params.wilaya || 'Alger',
        commune: params.commune || 'Alger-Centre'
      }
    }
  });

  if (error) throw error;
  return data;
}

export async function signInUser(email: string, password: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) return null;
  return data as Profile;
}