import axios, { AxiosError } from 'axios';
import { Job, CreateJobDto, JobStatus } from '../types/job';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export interface ApiErrorResponse {
  statusCode?: number;
  message: string | string[];
  error?: string;
}

export function extractErrorMessage(error: unknown): { message: string; statusCode?: number } {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiErrorResponse>;
    const statusCode = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    if (responseData?.message) {
      if (Array.isArray(responseData.message)) {
        return { message: responseData.message.join(', '), statusCode };
      }
      return { message: responseData.message, statusCode };
    }

    if (axiosError.code === 'ECONNABORTED') {
      return { message: 'Request timed out. Please try again.', statusCode };
    }

    if (!axiosError.response) {
      return { message: 'Unable to connect to the server. Please ensure the backend is running.', statusCode };
    }

    return { message: axiosError.message, statusCode };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'An unexpected error occurred.' };
}

export const jobApi = {
  async getJobs(): Promise<Job[]> {
    const response = await apiClient.get<Job[]>('/jobs');
    return response.data;
  },

  async createJob(dto: CreateJobDto): Promise<Job> {
    const response = await apiClient.post<Job>('/jobs', dto);
    return response.data;
  },

  async updateJobStatus(id: number, status: JobStatus): Promise<Job> {
    const response = await apiClient.patch<Job>(`/jobs/${id}/status`, { status });
    return response.data;
  },

  async deleteJob(id: number): Promise<void> {
    await apiClient.delete(`/jobs/${id}`);
  },
};
