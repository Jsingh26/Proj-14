import { IsEnum, IsNotEmpty } from 'class-validator';

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class UpdateJobStatusDto {
  @IsNotEmpty({ message: 'status is required' })
  @IsEnum(JobStatus, {
    message: 'status must be one of: PENDING, RUNNING, COMPLETED, FAILED',
  })
  status: JobStatus;
}
