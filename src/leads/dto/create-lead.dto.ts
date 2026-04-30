import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLeadDto {
  @IsString()
  agencyId!: string;

  @IsString()
  @IsOptional()
  propertyId?: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsBoolean()
  @IsOptional()
  isDiaspora?: boolean;

  @IsEnum(['immoafric', 'whatsapp', 'phone', 'other'])
  @IsOptional()
  source?: string;
}

export class UpdateLeadStageDto {
  @IsEnum(['new', 'contacted', 'visit_planned', 'negotiation', 'closed', 'lost'])
  stage!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  lostReason?: string;
}

export class AssignLeadDto {
  @IsString()
  assignedTo!: string;
}
