import React from 'react';
import { FilterStatus } from '../types/job';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  currentFilter: FilterStatus;
  totalJobsCount: number;
  onOpenCreateModal: () => void;
  onResetFilter: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  currentFilter,
  totalJobsCount,
  onOpenCreateModal,
  onResetFilter,
}) => {
  const isFilteredEmpty = totalJobsCount > 0 && currentFilter !== 'ALL';

  return (
    <div className="flex flex-col items-center justify-center p-12 sm:p-16 bg-white rounded-xl border border-slate-200 border-dashed text-center shadow-sm">
      <div className="p-3.5 bg-slate-100 text-slate-400 rounded-2xl mb-4">
        <Inbox className="w-8 h-8" />
      </div>

      {isFilteredEmpty ? (
        <>
          <h3 className="text-base font-semibold text-slate-800">
            No {currentFilter.toLowerCase()} jobs found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            There are currently no background jobs with the <span className="font-semibold text-slate-700">{currentFilter}</span> status.
          </p>
          <button
            type="button"
            onClick={onResetFilter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            Show All Jobs
          </button>
        </>
      ) : (
        <>
          <h3 className="text-base font-semibold text-slate-800">
            No jobs found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
            Create your first background job to get started and monitor its execution state.
          </p>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Job</span>
          </button>
        </>
      )}
    </div>
  );
};
