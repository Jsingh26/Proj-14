import React from 'react';
import { Job, JobStatus } from '../types/job';
import { JobRow } from './JobRow';

interface JobTableProps {
  jobs: Job[];
  onUpdateStatus: (id: number, status: JobStatus) => void;
  onDeleteJob: (id: number) => void;
  updatingJobId: number | null;
  deletingJobId: number | null;
}

export const JobTable: React.FC<JobTableProps> = ({
  jobs,
  onUpdateStatus,
  onDeleteJob,
  updatingJobId,
  deletingJobId,
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left">
        <thead className="bg-slate-50/80">
          <tr>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
              ID
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Title
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
              Type
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-44">
              Created At
            </th>
            <th scope="col" className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right w-44">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onUpdateStatus={onUpdateStatus}
              onDeleteJob={onDeleteJob}
              isUpdating={updatingJobId === job.id}
              isDeleting={deletingJobId === job.id}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
