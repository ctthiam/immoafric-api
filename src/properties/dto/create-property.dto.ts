import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(['apartment', 'villa', 'house', 'land', 'office', 'commercial', 'building', 'parking', 'other'])
  type!: string;

  @IsEnum(['sale', 'rent', 'rent_furnished', 'new_construction'])
  transaction!: string;

  @IsString()
  city!: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  pricePeriod?: string;

  @IsBoolean()
  @IsOptional()
  isNegotiable?: boolean;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  surface?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  rooms?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bedrooms?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  bathrooms?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  floors?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  parkingSpaces?: number;

  @IsEnum(['new', 'old', 'under_construction'])
  @IsOptional()
  condition?: string;

  @IsBoolean()
  @IsOptional()
  hasTitleDeed?: boolean;

  @IsBoolean()
  @IsOptional()
  isDiaspora?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;
}

export class UpdatePropertyDto extends CreatePropertyDto {}

export class RejectPropertyDto {
  @IsString()
  reason!: string;
}

export class UpdateStatusDto {
  @IsEnum(['draft', 'pending', 'published', 'sold', 'rented', 'archived'])
  status!: string;
}
