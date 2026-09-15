import React from 'react';
import { FilterStatus } from '../types/job';

interface StatusFilterProps {
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  counts: {
    all: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  };
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  currentFilter,
  onFilterChange,
  counts,
}) => {
  const options: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'ALL', label: 'All Jobs', count: counts.all },
    { id: 'PENDING', label: 'Pending', count: counts.pending },
    { id: 'RUNNING', label: 'Running', count: counts.running },
    { id: 'COMPLETED', label: 'Completed', count: counts.completed },
    { id: 'FAILED', label: 'Failed', count: counts.failed },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
      {options.map((opt) => {
        const isSelected = currentFilter === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onFilterChange(opt.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSelected
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>{opt.label}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                isSelected ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {opt.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
