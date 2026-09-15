import React, { useState } from 'react';
import { useJobs } from '../hooks/useJobs';
import { Header } from '../components/Header';
import { StatsCards } from '../components/StatsCards';
import { StatusFilter } from '../components/StatusFilter';
import { JobTable } from '../components/JobTable';
import { CreateJobModal } from '../components/CreateJobModal';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ToastContainer } from '../components/ToastContainer';
import { ShieldCheck, Cpu, Database } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    jobs,
    allJobsCount,
    filter,
    setFilter,
    stats,
    isLoading,
    isRefreshing,
    networkError,
    updatingJobId,
    deletingJobId,
    isCreating,
    autoPollEnabled,
    setAutoPollEnabled,
    lastSyncedAt,
    toasts,
    removeToast,
    fetchJobs,
    createJob,
    updateStatus,
    deleteJob,
  } = useJobs();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <Header
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onRefresh={() => fetchJobs(false)}
        isRefreshing={isRefreshing}
        autoPollEnabled={autoPollEnabled}
        onToggleAutoPoll={() => setAutoPollEnabled(!autoPollEnabled)}
        lastSyncedAt={lastSyncedAt}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Architecture & Invariant Highlights Bar */}
        <div className="bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 border border-indigo-100 rounded-xl p-3 sm:p-4 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-semibold text-slate-900">Defense-in-Depth Concurrency:</span>
            <span className="hidden md:inline text-slate-600">
              Redis Distributed Locks (`job:id:status-lock`) + PostgreSQL Conditional Atomic Updates protect state machine invariants.
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 font-mono">
              <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Redis SET NX EX 5
            </span>
            <span className="inline-flex items-center gap-1 font-mono">
              <Database className="w-3.5 h-3.5 text-blue-500" /> PostgreSQL 16
            </span>
          </div>
        </div>

        {/* Real-time Statistics Cards */}
        <StatsCards
          stats={stats}
          currentFilter={filter}
          onSelectFilter={setFilter}
        />

        {/* Filter Controls & Job Table Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Job Records
              </h2>
              <p className="text-xs text-slate-500">
                Showing {jobs.length} of {allJobsCount} total background jobs
              </p>
            </div>

            {/* Filter Tabs */}
            <StatusFilter
              currentFilter={filter}
              onFilterChange={setFilter}
              counts={{
                all: allJobsCount,
                pending: stats.pending,
                running: stats.running,
                completed: stats.completed,
                failed: stats.failed,
              }}
            />
          </div>

          {/* Content States */}
          {isLoading ? (
            <LoadingState />
          ) : networkError ? (
            <ErrorState
              message={networkError}
              onRetry={() => fetchJobs(false)}
              isRetrying={isRefreshing}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              currentFilter={filter}
              totalJobsCount={allJobsCount}
              onOpenCreateModal={() => setIsCreateModalOpen(true)}
              onResetFilter={() => setFilter('ALL')}
            />
          ) : (
            <JobTable
              jobs={jobs}
              onUpdateStatus={updateStatus}
              onDeleteJob={deleteJob}
              updatingJobId={updatingJobId}
              deletingJobId={deletingJobId}
            />
          )}
        </div>

        {/* Dataset Scale Note (per Section 14) */}
        <p className="text-[11px] text-slate-400 text-center pt-4">
          For the assignment's expected dataset size, filtering is performed client-side. For a larger dataset, filtering, pagination, and aggregation would be moved to the backend/database.
        </p>
      </main>

      {/* Create Job Dialog Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createJob}
        isCreating={isCreating}
      />

      {/* Floating Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
