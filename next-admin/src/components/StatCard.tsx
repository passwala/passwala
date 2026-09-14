import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'purple' | 'blue' | 'emerald' | 'orange' | 'amber' | 'rose';
  trend?: string;
  onClick?: () => void;
}

const colorMap = {
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-600',
    border: 'border-purple-100',
    text: 'text-purple-700'
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-600',
    border: 'border-blue-100',
    text: 'text-blue-700'
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-600',
    border: 'border-emerald-100',
    text: 'text-emerald-700'
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-600',
    border: 'border-orange-100',
    text: 'text-orange-700'
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-600',
    border: 'border-amber-100',
    text: 'text-amber-700'
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-600',
    border: 'border-rose-100',
    text: 'text-rose-700'
  }
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'purple',
  trend,
  onClick
}: StatCardProps) {
  const c = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl bg-white p-6 border transition-all duration-200 shadow-sm hover:shadow-md',
        onClick ? 'cursor-pointer hover:border-slate-300' : 'border-slate-100'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-black tracking-tight text-slate-900">{value}</p>
          {subtitle && (
            <p className="text-xs font-medium text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <span className="inline-flex items-center text-xs font-bold text-emerald-600">
              {trend}
            </span>
          )}
        </div>
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-sm shrink-0', c.iconBg)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className={cn('absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-xl', c.iconBg)} />
    </div>
  );
}
