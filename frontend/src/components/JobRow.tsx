import React from 'react';
import { Job, JobStatus } from '../types/job';
import { StatusBadge } from './StatusBadge';
import { Play, Check, X, Trash2, Loader2 } from 'lucide-react';

interface JobRowProps {
  job: Job;
  onUpdateStatus: (id: number, status: JobStatus) => void;
  onDeleteJob: (id: number) => void;
  isUpdating: boolean;
  isDeleting: boolean;
}

export const JobRow: React.FC<JobRowProps> = ({
  job,
  onUpdateStatus,
  onDeleteJob,
  isUpdating,
  isDeleting,
}) => {
  const isBusy = isUpdating || isDeleting;

  // Format date readable
  const formattedDate = new Date(job.createdAt).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <tr className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 last:border-0">
      {/* ID */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono font-medium text-slate-500">
        #{job.id}
      </td>

      {/* Title */}
      <td className="px-4 py-3.5 text-sm font-medium text-slate-900 max-w-xs truncate">
        {job.title}
      </td>

      {/* Type */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-700 border border-slate-200">
          {job.type}
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5 whitespace-nowrap">
        <StatusBadge status={job.status} />
      </td>

      {/* Created At */}
      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500 font-mono">
        {formattedDate}
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
        <div className="flex items-center justify-end gap-1.5">
          {/* PENDING Actions: [Start] [Delete] */}
          {job.status === 'PENDING' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(job.id, 'RUNNING')}
              disabled={isBusy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 transition"
              title="Start Job"
            >
              {isUpdating ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{isUpdating ? 'Starting...' : 'Start'}</span>
            </button>
          )}

          {/* RUNNING Actions: [Complete] [Fail] [Delete] */}
          {job.status === 'RUNNING' && (
            <>
              <button
                type="button"
                onClick={() => onUpdateStatus(job.id, 'COMPLETED')}
                disabled={isBusy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200 disabled:opacity-50 transition"
                title="Complete Job"
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Complete</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateStatus(job.id, 'FAILED')}
                disabled={isBusy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:bg-rose-200 disabled:opacity-50 transition"
                title="Mark as Failed"
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>Fail</span>
              </button>
            </>
          )}

          {/* All Statuses: [Delete] */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete Job #${job.id}?`)) {
                onDeleteJob(job.id);
              }
            }}
            disabled={isBusy}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 disabled:opacity-50 transition"
            title="Delete Job"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
