import Link from 'next/link';

export function Navigation() {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-black tracking-tight text-emerald-400">ECHRIMHENI</span>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded uppercase border border-slate-700">Admin MVP</span>
          </Link>
          <span className="text-xs text-slate-400 hidden sm:inline">Acheter en confiance. Faire vérifier avant de payer.</span>
        </div>

        <nav className="flex items-center space-x-6 text-sm font-medium">
          <Link href="/" className="text-slate-300 hover:text-white transition">Dashboard</Link>
          <Link href="/experts" className="text-slate-300 hover:text-white transition flex items-center gap-1.5">
            <span>Experts</span>
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs px-1.5 py-0.5 rounded-full font-bold">En attente</span>
          </Link>
          <Link href="/missions" className="text-slate-300 hover:text-white transition">Missions</Link>
          <Link href="/audit" className="text-slate-300 hover:text-white transition">Audit</Link>
        </nav>
      </div>
    </header>
  );
}