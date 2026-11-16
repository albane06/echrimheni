'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { signInUser, getCurrentUserWithProfile, resolveAdminAccess } from '@echrimheni/database/services/auth';
import { Card, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAdminAuth } from '@/components/AdminGuard';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refresh } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInUser(email.trim(), password);
      const { sessionUser, profile } = await getCurrentUserWithProfile();
      const decision = resolveAdminAccess({ sessionUser, profile });
      if (!decision.allowed) {
        if (!decision.isAuthenticated) {
          setError('Connexion impossible : session introuvable.');
        } else {
          setError('Accès réservé aux administrateurs. Ce compte ne possède pas le rôle ADMIN.');
        }
        return;
      }
      await refresh();
      router.push('/');
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Échec de la connexion.';
      if (message.includes('SUPABASE_CONFIGURATION_REQUIRED')) {
        setError(
          'Configuration Supabase manquante. Renseignez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans apps/web-admin/.env.local.'
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-11 w-11 rounded-xl bg-emerald-600 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle>Administration EchriMheni</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Connexion réservée au rôle ADMIN (Supabase Auth).</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email administrateur"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@exemple.dz"
          />
          <Input
            label="Mot de passe"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          {error && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full">
            Se connecter
          </Button>
        </form>
        <p className="text-[11px] text-slate-400 mt-4 text-center">
          La session est vérifiée via Supabase Auth + table profiles. Les comptes BUYER/EXPERT sont refusés.
        </p>
      </Card>
    </div>
  );
}
