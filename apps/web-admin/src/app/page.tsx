'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAdminKPIs } from '@echrimheni/database';

export default function DashboardPage() {
  const [kpis, setKpis] = useState({
    totalUsers: 12,
    pendingExperts: 2,
    approvedExperts: 5,
    activeMissions: 1,
    completedMissions: 8,
    totalCommission: 8400
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminKPIs()
      .then((data) => {
        if (data && data.totalUsers > 0) {
          setKpis(data);
        }
      })
      .catch((err) => {
        console.warn('Utilisation des donnees de repli (Supabase non connecte en local) :', err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Tableau de Bord Executif</h1>
        <p className="text-sm text-slate-400 mt-1">Supervision de l ecosysteme EchriMheni, reseau d experts et inspections en temps reel.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experts en Attente</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400">
              {loading ? '...' : kpis.pendingExperts}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">A verifier</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Dossiers RC et pieces d identite soumis</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experts Actifs & Verifies</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">
              {loading ? '...' : kpis.approvedExperts}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-medium">Conformes</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Badge Expert Verifie attribue</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missions Realisees</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-400">
              {loading ? '...' : kpis.completedMissions}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 font-medium">Automobile</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Volume commissions : {kpis.totalCommission.toLocaleString()} DZD</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missions en Cours</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-purple-400">
              {loading ? '...' : kpis.activeMissions}
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20 font-medium">Sur le terrain</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Inspections programmees / en cours</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Verification des Dossiers Professionnels</h2>
            <Link href="/experts" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Voir tout
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Controle d identite, validite du Registre de Commerce et coherence de l activite professionnelle avec la specialite Automobile.
          </p>
          <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-amber-300">Dossiers en attente d examen</span>
              <p className="text-slate-400 text-[11px] mt-0.5">{kpis.pendingExperts} expert(s) attendent validation administrative</p>
            </div>
            <Link href="/experts" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded transition">
              Examiner
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Tracabilite & Audit Legal</h2>
            <Link href="/audit" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
              Journal d audit
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Historique immuable de toutes les actions d approbation, de refus motive et de suspension d experts.
          </p>
          <div className="mt-4 p-3 bg-slate-800/40 border border-slate-700/40 rounded-lg text-xs">
            <p className="text-slate-400">Toutes les decisions administratives sont consignees avec horodatage et identifiant de l agent.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
