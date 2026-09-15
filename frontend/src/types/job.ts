export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface Job {
  id: number;
  title: string;
  type: string;
  status: JobStatus;
  createdAt: string;
}

export interface CreateJobDto {
  title: string;
  type: string;
}

export interface UpdateJobStatusDto {
  status: JobStatus;
}

export type FilterStatus = 'ALL' | JobStatus;

export interface JobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}
