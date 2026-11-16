import React from 'react';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const dotVariants = {
  default: 'bg-slate-300 border-slate-100',
  success: 'bg-emerald-500 border-emerald-100',
  warning: 'bg-amber-500 border-amber-100',
  danger: 'bg-red-500 border-red-100',
  info: 'bg-blue-500 border-blue-100',
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn('relative', className)}>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
          {/* Vertical line */}
          {index < events.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200" />
          )}
          {/* Dot */}
          <div className="relative flex-shrink-0">
            {event.icon ? (
              <div className={cn(
                'h-6 w-6 rounded-full flex items-center justify-center border-2',
                dotVariants[event.variant || 'default']
              )}>
                {event.icon}
              </div>
            ) : (
              <div className={cn(
                'h-6 w-6 rounded-full border-4',
                dotVariants[event.variant || 'default']
              )} />
            )}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-medium text-slate-900">{event.title}</p>
            {event.description && (
              <p className="text-sm text-slate-500 mt-0.5">{event.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">{formatDateTime(event.timestamp)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
