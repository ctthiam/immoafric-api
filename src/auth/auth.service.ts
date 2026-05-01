import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerToken = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        phone: dto.phone,
        country: dto.country ?? 'SN',
        emailVerToken,
      },
    });

    await this.mail.sendEmailVerification(user.email, user.firstName, emailVerToken);

    return {
      success: true,
      data: { id: user.id, email: user.email },
      message: 'Compte créé. Vérifiez votre email pour activer votre compte.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerToken: token } });
    if (!user) throw new NotFoundException('Lien de vérification invalide ou expiré');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true, emailVerToken: null },
    });

    return { success: true, data: null, message: 'Email vérifié. Vous pouvez vous connecter.' };
  }

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Email ou mot de passe incorrect');
    if (!user.isActive) throw new UnauthorizedException('Compte désactivé');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email ou mot de passe incorrect');

    if (user.twoFaEnabled) {
      if (!dto.twoFaCode) {
        return { success: true, data: { requires2fa: true }, message: 'Code 2FA requis' };
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFaSecret ?? '',
        encoding: 'base32',
        token: dto.twoFaCode,
        window: 1,
      });
      if (!verified) throw new UnauthorizedException('Code 2FA invalide');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m',
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') ?? '7d',
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { passwordHash: _, twoFaSecret: __, emailVerToken: ___, resetPwToken: ____, ...safeUser } = user;

    return {
      success: true,
      data: { user: safeUser, accessToken },
      message: 'Connexion réussie',
    };
  }

  async refresh(refreshToken: string, res: Response) {
    try {
      const payload = this.jwt.verify<{ sub: string; email: string; role: string }>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException('Session expirée');

      const newAccessToken = this.jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        {
          secret: this.config.get('JWT_SECRET'),
          expiresIn: this.config.get('JWT_EXPIRES_IN') ?? '15m',
        },
      );

      res.cookie('access_token', newAccessToken, {
        httpOnly: true,
        secure: this.config.get('NODE_ENV') === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      return { success: true, data: null, message: 'Token rafraîchi' };
    } catch {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }
  }

  logout(res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    return { success: true, data: null, message: 'Déconnexion réussie' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: true, data: null, message: 'Si cet email existe, vous recevrez un lien.' };
    }

    const token = randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetPwToken: token, resetPwExpiry: expiry },
    });

    await this.mail.sendPasswordReset(user.email, user.firstName, token);

    return { success: true, data: null, message: 'Si cet email existe, vous recevrez un lien.' };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetPwToken: token,
        resetPwExpiry: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Lien expiré ou invalide');

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetPwToken: null, resetPwExpiry: null },
    });

    return { success: true, data: null, message: 'Mot de passe mis à jour avec succès' };
  }

  async generate2fa(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const secret = speakeasy.generateSecret({ name: `ImmoAfric (${user.email})` });
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaSecret: secret.base32 },
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url ?? '');
    return { success: true, data: { qrCode, secret: secret.base32 }, message: 'Scannez le QR code' };
  }

  async confirm2fa(userId: string, token: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const verified = speakeasy.totp.verify({
      secret: user.twoFaSecret ?? '',
      encoding: 'base32',
      token,
      window: 1,
    });
    if (!verified) throw new BadRequestException('Code invalide');

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFaEnabled: true },
    });

    return { success: true, data: null, message: '2FA activé avec succès' };
  }
}
