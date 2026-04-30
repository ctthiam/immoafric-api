import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(2, { message: 'Prénom trop court' })
  firstName!: string;

  @IsString()
  @MinLength(2, { message: 'Nom trop court' })
  lastName!: string;

  @IsString()
  @MinLength(8, { message: 'Mot de passe minimum 8 caractères' })
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['SN', 'CI', 'FR', 'US', 'BE', 'MA', 'GN', 'ML', 'BF'])
  country?: string;
}
