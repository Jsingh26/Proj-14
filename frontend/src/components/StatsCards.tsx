import React from 'react';
import { JobStats, FilterStatus } from '../types/job';
import { Clock, Play, CheckCircle2, XCircle, Layers } from 'lucide-react';

interface StatsCardsProps {
  stats: JobStats;
  currentFilter: FilterStatus;
  onSelectFilter: (filter: FilterStatus) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  stats,
  currentFilter,
  onSelectFilter,
}) => {
  const cards = [
    {
      id: 'ALL' as FilterStatus,
      label: 'Total Jobs',
      count: stats.total,
      icon: Layers,
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-100',
      activeRing: 'ring-2 ring-slate-400',
    },
    {
      id: 'PENDING' as FilterStatus,
      label: 'Pending',
      count: stats.pending,
      icon: Clock,
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50 border-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800',
      activeRing: 'ring-2 ring-amber-400',
    },
    {
      id: 'RUNNING' as FilterStatus,
      label: 'Running',
      count: stats.running,
      icon: Play,
      textColor: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      badgeBg: 'bg-blue-100 text-blue-800',
      activeRing: 'ring-2 ring-blue-400',
    },
    {
      id: 'COMPLETED' as FilterStatus,
      label: 'Completed',
      count: stats.completed,
      icon: CheckCircle2,
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800',
      activeRing: 'ring-2 ring-emerald-400',
    },
    {
      id: 'FAILED' as FilterStatus,
      label: 'Failed',
      count: stats.failed,
      icon: XCircle,
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50 border-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800',
      activeRing: 'ring-2 ring-rose-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = currentFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelectFilter(card.id)}
            className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-150 shadow-sm ${
              isSelected
                ? `bg-white ${card.activeRing} shadow-md`
                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {card.label}
              </span>
              <div className={`p-1.5 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-4 h-4 ${card.textColor}`} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tracking-tight ${card.textColor}`}>
                {card.count}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
