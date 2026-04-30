import { IsEmail, IsString, MinLength, IsOptional, IsNumberString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email invalide' })
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;

  @IsOptional()
  @IsNumberString()
  twoFaCode?: string;
}
