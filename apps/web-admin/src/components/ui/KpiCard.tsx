import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  className?: string;
  loading?: boolean;
}

export function KpiCard({ title, value, subtitle, icon, trend, className, loading }: KpiCardProps) {
  return (
    <div className={cn('bg-white border border-slate-200 rounded-xl p-6 shadow-sm', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {loading ? (
            <div className="h-9 w-24 bg-slate-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
          )}
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-slate-100">
          {trend.value > 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          ) : trend.value < 0 ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Minus className="h-4 w-4 text-slate-400" />
          )}
          <span className={cn(
            'text-xs font-semibold',
            trend.value > 0 ? 'text-emerald-600' : trend.value < 0 ? 'text-red-600' : 'text-slate-400'
          )}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-slate-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
