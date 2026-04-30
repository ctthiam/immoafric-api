import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['call', 'email', 'visit', 'document', 'other'])
  @IsOptional()
  type?: string;

  @IsISO8601()
  dueAt!: string;

  @IsString()
  @IsOptional()
  leadId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsISO8601()
  @IsOptional()
  dueAt?: string;

  @IsOptional()
  isDone?: boolean;
}
