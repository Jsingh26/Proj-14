import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateJobDto {
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title cannot be empty' })
  @MinLength(3, { message: 'title must be at least 3 characters long' })
  @MaxLength(120, { message: 'title cannot exceed 120 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @IsString({ message: 'type must be a string' })
  @IsNotEmpty({ message: 'type cannot be empty' })
  @MinLength(2, { message: 'type must be at least 2 characters long' })
  @MaxLength(50, { message: 'type cannot exceed 50 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  type: string;
}
