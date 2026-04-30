import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SyncPropertyDto {
  @IsString()
  externalId!: string;

  @IsString()
  agencyExternalId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(['apartment', 'villa', 'house', 'land', 'office', 'commercial', 'building', 'other'])
  type!: string;

  @IsEnum(['sale', 'rent', 'rent_furnished', 'new_construction'])
  transaction!: string;

  @IsNumber()
  price!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  pricePeriod?: string;

  @IsNumber()
  @IsOptional()
  surface?: number;

  @IsNumber()
  @IsOptional()
  rooms?: number;

  @IsNumber()
  @IsOptional()
  bedrooms?: number;

  @IsNumber()
  @IsOptional()
  bathrooms?: number;

  @IsString()
  city!: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  country?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsEnum(['available', 'rented', 'sold', 'inactive'])
  @IsOptional()
  status?: string;
}

export class BulkImportDto {
  @IsString()
  agencyExternalId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncPropertyDto)
  properties!: SyncPropertyDto[];
}

export class RegisterAgencyDto {
  @IsString()
  agencyId!: string;

  @IsString()
  propafrAgencyId!: string;
}
