import { IsEnum, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchPropertyDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(['sale', 'rent', 'rent_furnished', 'new_construction'])
  @IsOptional()
  transaction?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  neighborhood?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  priceMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  priceMax?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  surfaceMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  surfaceMax?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  bedroomsMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  roomsMin?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  hasTitleDeed?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isDiaspora?: boolean;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isFeatured?: boolean;

  @IsEnum(['price_asc', 'price_desc', 'date_desc', 'views_desc'])
  @IsOptional()
  sort?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
