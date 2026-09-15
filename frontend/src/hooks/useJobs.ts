import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Job, JobStatus, FilterStatus, JobStats, CreateJobDto } from '../types/job';
import { jobApi, extractErrorMessage } from '../services/jobApi';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // Per-job action states
  const [updatingJobId, setUpdatingJobId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Auto-polling state
  const [autoPollEnabled, setAutoPollEnabled] = useState<boolean>(true);
  const [pollIntervalSeconds] = useState<number>(6);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      // Auto-remove toast after 5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Fetch jobs function
  const fetchJobs = useCallback(
    async (isBackground = false) => {
      if (!isBackground) {
        setIsRefreshing(true);
      }
      try {
        const data = await jobApi.getJobs();
        setJobs(data);
        setNetworkError(null);
        setLastSyncedAt(new Date());
      } catch (err) {
        const { message } = extractErrorMessage(err);
        if (!isBackground) {
          setNetworkError(message);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-polling interval
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!autoPollEnabled) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(() => {
      fetchJobs(true);
    }, pollIntervalSeconds * 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [autoPollEnabled, pollIntervalSeconds, fetchJobs]);

  // Derived statistics
  const stats: JobStats = useMemo(() => {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;

    for (const job of jobs) {
      switch (job.status) {
        case 'PENDING':
          pending++;
          break;
        case 'RUNNING':
          running++;
          break;
        case 'COMPLETED':
          completed++;
          break;
        case 'FAILED':
          failed++;
          break;
      }
    }

    return {
      pending,
      running,
      completed,
      failed,
      total: jobs.length,
    };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (filter === 'ALL') return jobs;
    return jobs.filter((j) => j.status === filter);
  }, [jobs, filter]);

  // Action: Create Job
  const createJob = useCallback(
    async (dto: CreateJobDto): Promise<boolean> => {
      setIsCreating(true);
      try {
        const newJob = await jobApi.createJob(dto);
        setJobs((prev) => [newJob, ...prev]);
        addToast('success', 'Job Created', `Job #${newJob.id} "${newJob.title}" added to the queue.`);
        await fetchJobs(true);
        return true;
      } catch (err) {
        const { message } = extractErrorMessage(err);
        addToast('error', 'Failed to Create Job', message);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [addToast, fetchJobs],
  );

  // Action: Update Status
  const updateStatus = useCallback(
    async (id: number, targetStatus: JobStatus) => {
      setUpdatingJobId(id);
      try {
        const updated = await jobApi.updateJobStatus(id, targetStatus);
        setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
        addToast(
          'success',
          'Status Updated',
          `Job #${id} transitioned to ${targetStatus}.`,
        );
      } catch (err) {
        const { message, statusCode } = extractErrorMessage(err);

        if (statusCode === 409) {
          // Concurrency conflict
          addToast(
            'warning',
            'Concurrency Conflict (409)',
            `${message} Refreshing latest state from server...`,
          );
        } else if (statusCode === 404) {
          addToast('error', 'Job Not Found (404)', 'This job no longer exists on the server.');
        } else if (statusCode === 503) {
          addToast('error', 'Lock Service Unavailable (503)', 'Redis distributed locking service is currently unreachable.');
        } else {
          addToast('error', 'Update Failed', message);
        }

        // Always refresh server state after conflict or error
        await fetchJobs(true);
      } finally {
        setUpdatingJobId(null);
      }
    },
    [addToast, fetchJobs],
  );

  // Action: Delete Job
  const deleteJob = useCallback(
    async (id: number) => {
      setDeletingJobId(id);
      try {
        await jobApi.deleteJob(id);
        setJobs((prev) => prev.filter((j) => j.id !== id));
        addToast('info', 'Job Deleted', `Job #${id} removed from the queue.`);
      } catch (err) {
        const { message, statusCode } = extractErrorMessage(err);
        if (statusCode === 404) {
          addToast('error', 'Not Found', 'Job does not exist on the server.');
        } else {
          addToast('error', 'Delete Failed', message);
        }
        await fetchJobs(true);
      } finally {
        setDeletingJobId(null);
      }
    },
    [addToast, fetchJobs],
  );

  return {
    jobs: filteredJobs,
    allJobsCount: jobs.length,
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
  };
}
