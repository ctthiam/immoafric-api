import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = (req.cookies as Record<string, string>)['refresh_token'];
    return this.auth.refresh(token, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: User) {
    const { passwordHash, twoFaSecret, emailVerToken, resetPwToken, resetPwExpiry, ...safe } = user;
    return { success: true, data: safe, message: 'OK' };
  }

  @Get('2fa/generate')
  @Roles('admin')
  generate2fa(@CurrentUser() user: User) {
    return this.auth.generate2fa(user.id);
  }

  @Post('2fa/confirm')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  confirm2fa(@CurrentUser() user: User, @Body('token') token: string) {
    return this.auth.confirm2fa(user.id, token);
  }
}
