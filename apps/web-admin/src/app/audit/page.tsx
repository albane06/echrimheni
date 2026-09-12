'use client';

import { INITIAL_AUDIT_LOGS } from '../../lib/mock-admin-data';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Journal d Audit Administratif</h1>
        <p className="text-sm text-slate-400 mt-1">Traçabilité immuable des actions critiques d administration.</p>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="p-4">Date / Heure</th>
              <th className="p-4">Administrateur</th>
              <th className="p-4">Action</th>
              <th className="p-4">Cible</th>
              <th className="p-4">Détails de l opération</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {INITIAL_AUDIT_LOGS.map(log => (
              <tr key={log.id} className="hover:bg-slate-800/30 transition">
                <td className="p-4 text-slate-400">{log.created_at}</td>
                <td className="p-4 font-medium text-white">{log.admin_id}</td>
                <td className="p-4 font-bold text-emerald-400">{log.action_type}</td>
                <td className="p-4 text-slate-300">{log.target_type} ({log.target_id})</td>
                <td className="p-4 text-slate-400 font-mono text-[11px]">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}