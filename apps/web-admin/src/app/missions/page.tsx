'use client';

import { INITIAL_MISSIONS } from '../../lib/mock-admin-data';

export default function MissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Supervision des Missions</h1>
        <p className="text-sm text-slate-400 mt-1">Suivi de l état d avancement des inspections automobiles et consultation des rapports.</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-4">Mission / Véhicule</th>
              <th className="p-4">Acheteur</th>
              <th className="p-4">Expert Attribué</th>
              <th className="p-4">Date</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Score</th>
              <th className="p-4 text-right">Rapport</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {INITIAL_MISSIONS.map(m => (
              <tr key={m.id} className="hover:bg-slate-800/30 transition">
                <td className="p-4 font-semibold text-white">{m.vehicle}</td>
                <td className="p-4">{m.buyer_name}</td>
                <td className="p-4">{m.expert_name}</td>
                <td className="p-4 text-slate-400">{m.date}</td>
                <td className="p-4">
                  <span className={px-2 py-0.5 rounded font-bold uppercase }>
                    {m.status}
                  </span>
                </td>
                <td className="p-4 font-bold text-white">
                  {m.score !== null ? ${m.score} / 100 : 'En cours...'}
                </td>
                <td className="p-4 text-right">
                  {m.status === 'COMPLETED' ? (
                    <span className="text-emerald-400 font-semibold cursor-pointer hover:underline">Consulter</span>
                  ) : (
                    <span className="text-slate-500">Non disponible</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}