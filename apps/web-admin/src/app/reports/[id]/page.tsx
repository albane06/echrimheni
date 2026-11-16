'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAllReports } from '@echrimheni/database';
import { Card, CardTitle, Button, Badge, LoadingState, ErrorState } from '@/components/ui';
import { ArrowLeft, Download, CheckCircle, AlertTriangle, XOctagon, ShieldAlert } from 'lucide-react';

interface ReportData {
  id: string;
  score: number;
  summary: string;
  positive_points: string[];
  watchpoints: string[];
  major_defects: string[];
  critical_defects: string[];
  expert_name: string;
  vehicle: string;
  disclaimer: string;
}

function normalizeReport(r: any): ReportData {
  return {
    id: r.id,
    score: r.score,
    summary: r.summary,
    positive_points: r.positive_points || [],
    watchpoints: r.watchpoints || [],
    major_defects: r.major_defects || [],
    critical_defects: r.critical_defects || [],
    expert_name: r.bookings?.expert?.profiles?.full_name || 'Expert',
    vehicle: r.bookings?.listings?.title
      || `${r.bookings?.listings?.make || ''} ${r.bookings?.listings?.model || ''} ${r.bookings?.listings?.year || ''}`.trim()
      || 'Objet inspecté',
    disclaimer: r.disclaimer,
  };
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(`/api/reports/${data.id}/pdf`);
      const json = await res.json();
      if (!res.ok || !json.signedUrl) {
        throw new Error(json.error || 'Génération du PDF impossible.');
      }
      window.open(json.signedUrl, '_blank', 'noopener');
    } catch (err: any) {
      setPdfError(err?.message || 'Téléchargement impossible.');
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getAllReports();
      const found = (all || []).find((r: any) => r.id === reportId || r.booking_id === reportId);
      if (!found) {
        setError('Rapport introuvable.');
      } else {
        setData(normalizeReport(found));
      }
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger le rapport.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingState message="Chargement du rapport..." />;
  if (error || !data) {
    return <ErrorState title="Rapport introuvable" message={error || ''} onRetry={() => router.push('/reports')} />;
  }

  const scoreColor = data.score >= 75 ? 'text-emerald-600' : data.score >= 50 ? 'text-amber-600' : 'text-red-600';
  const scoreBg = data.score >= 75 ? 'bg-emerald-50 border-emerald-200' : data.score >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    <div className="space-y-6">
      <button onClick={() => router.push('/reports')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="h-4 w-4" /> Retour aux rapports
      </button>

      {/* Header with Score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{data.vehicle}</h2>
          <p className="text-sm text-slate-500 mt-1">Expert : {data.expert_name}</p>
        </div>
        <div className={`flex items-center gap-4 px-6 py-4 rounded-xl border ${scoreBg}`}>
          <div className="text-center">
            <div className={`text-5xl font-black ${scoreColor}`}>{data.score}</div>
            <p className="text-xs text-slate-500 mt-1">sur 100</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardTitle>Résumé de l&apos;inspection</CardTitle>
        <p className="text-sm text-slate-600 mt-3 leading-relaxed">{data.summary}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Positive Points */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <CardTitle>Points Positifs</CardTitle>
            <Badge variant="success">{data.positive_points.length}</Badge>
          </div>
          <ul className="space-y-2">
            {data.positive_points.map((p: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Card>

        {/* Watchpoints */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle>Points de Vigilance</CardTitle>
            <Badge variant="warning">{data.watchpoints.length}</Badge>
          </div>
          {data.watchpoints.length > 0 ? (
            <ul className="space-y-2">
              {data.watchpoints.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Aucun point de vigilance identifié.</p>
          )}
        </Card>

        {/* Major Defects */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <XOctagon className="h-5 w-5 text-orange-500" />
            <CardTitle>Défauts Majeurs</CardTitle>
            <Badge variant={data.major_defects.length > 0 ? 'danger' : 'neutral'}>{data.major_defects.length}</Badge>
          </div>
          {data.major_defects.length > 0 ? (
            <ul className="space-y-2">
              {data.major_defects.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <XOctagon className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Aucun défaut majeur identifié.</p>
          )}
        </Card>

        {/* Critical Defects */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <CardTitle>Défauts Critiques</CardTitle>
            <Badge variant={data.critical_defects.length > 0 ? 'danger' : 'neutral'}>{data.critical_defects.length}</Badge>
          </div>
          {data.critical_defects.length > 0 ? (
            <ul className="space-y-2">
              {data.critical_defects.map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-800 font-medium">
                  <ShieldAlert className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-600 font-medium">Aucun défaut critique. ✓</p>
          )}
        </Card>
      </div>

      {/* Disclaimer + PDF */}
      <Card className="bg-slate-50">
        <p className="text-xs text-slate-400 italic">{data.disclaimer}</p>
        <div className="mt-4">
          <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleDownloadPdf} loading={pdfLoading}>
            Télécharger le rapport PDF
          </Button>
          {pdfError && <p className="text-xs text-red-600 mt-2">{pdfError}</p>}
        </div>
      </Card>
    </div>
  );
}
