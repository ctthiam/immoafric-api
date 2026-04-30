import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8, { message: 'Mot de passe minimum 8 caractères' })
  password!: string;
}
