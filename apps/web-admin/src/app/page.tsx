'use client';

import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Tableau de Bord Exécutif</h1>
        <p className="text-sm text-slate-400 mt-1">Supervision de l écosystème EchriMheni, réseau d experts et inspections en temps réel.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experts en Attente</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-400">1</span>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20 font-medium">À vérifier</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Dossiers RC et pièces d identité soumis</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Experts Actifs & Vérifiés</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-400">1</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 font-medium">Conformes</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Note moyenne réseau : 4.85 / 5.0</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missions Réalisées</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-blue-400">1</span>
            <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 font-medium">Automobile</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Commissions : 1 050 DZD</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Missions en Cours</div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-purple-400">1</span>
            <span className="text-xs px-2 py-0.5 rounded bg-purple-400/10 text-purple-400 border border-purple-400/20 font-medium">Terrain</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">Clio 4 en cours d inspection</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Vérification des Dossiers Professionnels</h2>
            <Link href="/experts" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">
              Voir tout
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Contrôle d identité, validité du Registre de Commerce et cohérence de l activité professionnelle avec la spécialité Automobile.
          </p>
          <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-amber-300">Yacine Mansouri</span> • Blida
              <p className="text-slate-400 text-[11px] mt-0.5">Activité : Maintenance & diagnostic auto</p>
            </div>
            <Link href="/experts" className="bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded transition">
              Examiner
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Traçabilité & Audit Légal</h2>
            <Link href="/audit" className="text-xs font-semibold text-blue-400 hover:text-blue-300">
              Journal d audit
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-2">
            Historique immuable de toutes les actions d approbation, de refus motivé et de suspension d experts.
          </p>
          <div className="mt-4 p-3 bg-slate-800/40 border border-slate-700/40 rounded-lg text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="font-medium text-emerald-400">EXPERT_APPROVED</span>
              <span className="text-slate-500">02/09/2026</span>
            </div>
            <p className="text-slate-400 mt-1">Validation Karim Benali (Automobile) par admin-001</p>
          </div>
        </div>
      </div>
    </div>
  );
}