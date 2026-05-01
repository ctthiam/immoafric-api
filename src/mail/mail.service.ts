import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend!: Resend;
  private readonly logger = new Logger(MailService.name);
  private readonly from = 'ImmoAfric <no-reply@immoafric.com>';

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('RESEND_API_KEY manquante — emails désactivés (staging sans email)');
    }
  }

  async sendEmailVerification(email: string, firstName: string, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.send(email, 'Activez votre compte ImmoAfric', `
      <h2>Bonjour ${firstName},</h2>
      <p>Merci de vous être inscrit sur ImmoAfric, le premier portail immobilier digital d'Afrique de l'Ouest.</p>
      <p>Cliquez sur le bouton ci-dessous pour activer votre compte :</p>
      <a href="${verifyUrl}" style="background:#C9861A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
        Activer mon compte
      </a>
      <p>Ce lien expire dans 24h.</p>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  async sendPasswordReset(email: string, firstName: string, token: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.send(email, 'Réinitialisation de votre mot de passe', `
      <h2>Bonjour ${firstName},</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe ImmoAfric.</p>
      <a href="${resetUrl}" style="background:#C9861A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
        Réinitialiser mon mot de passe
      </a>
      <p>Ce lien expire dans 1h. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  async sendNewLeadNotification(
    agentEmail: string,
    agentName: string,
    leadName: string,
    propertyTitle: string,
    leadId: string,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    const leadUrl = `${frontendUrl}/pro/crm/${leadId}`;

    await this.send(agentEmail, `Nouveau prospect — ${propertyTitle}`, `
      <h2>Bonjour ${agentName},</h2>
      <p>Vous avez reçu un nouveau prospect pour votre annonce <strong>${propertyTitle}</strong>.</p>
      <p><strong>Nom :</strong> ${leadName}</p>
      <a href="${leadUrl}" style="background:#C9861A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
        Voir le prospect
      </a>
      <p><em>Répondez dans les 24h pour maximiser vos chances de conversion.</em></p>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  async sendAnnouncementApproved(email: string, firstName: string, propertyTitle: string, propertySlug: string) {
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    const propertyUrl = `${frontendUrl}/annonces/${propertySlug}`;

    await this.send(email, 'Votre annonce est publiée !', `
      <h2>Bonjour ${firstName},</h2>
      <p>Votre annonce <strong>${propertyTitle}</strong> a été validée et est maintenant visible sur ImmoAfric.</p>
      <a href="${propertyUrl}" style="background:#C9861A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0;">
        Voir mon annonce
      </a>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  async sendAnnouncementRejected(email: string, firstName: string, propertyTitle: string, reason: string) {
    await this.send(email, 'Votre annonce nécessite des modifications', `
      <h2>Bonjour ${firstName},</h2>
      <p>Votre annonce <strong>${propertyTitle}</strong> n'a pas pu être publiée pour la raison suivante :</p>
      <blockquote style="border-left:4px solid #C9861A;padding-left:16px;color:#666;">${reason}</blockquote>
      <p>Veuillez corriger votre annonce et la resoumettre.</p>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  async sendAlertMatch(
    email: string,
    firstName: string,
    alertName: string,
    properties: Array<{ slug: string; title: string; price: any; currency: string; city: string }>,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
    const rows = properties.map(p => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;">
          <a href="${frontendUrl}/annonces/${p.slug}" style="font-weight:600;color:#0F1B2D;text-decoration:none;">${p.title}</a><br>
          <span style="color:#C9861A;font-weight:700;">${Number(p.price).toLocaleString('fr')} ${p.currency}</span>
          <span style="color:#888;font-size:12px;"> — ${p.city}</span>
        </td>
      </tr>
    `).join('');

    await this.send(email, `${properties.length} nouveau${properties.length > 1 ? 'x' : ''} bien${properties.length > 1 ? 's' : ''} — alerte "${alertName}"`, `
      <h2>Bonjour ${firstName},</h2>
      <p>${properties.length} nouveau${properties.length > 1 ? 'x' : ''} bien${properties.length > 1 ? 's' : ''} correspond${properties.length > 1 ? 'ent' : ''} à votre alerte <strong>${alertName}</strong> :</p>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
      <a href="${frontendUrl}/annonces" style="background:#C9861A;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:20px 0;">
        Voir toutes les annonces
      </a>
      <p style="color:#888;font-size:12px;">
        Pour gérer vos alertes : <a href="${frontendUrl}/alertes" style="color:#C9861A;">${frontendUrl}/alertes</a>
      </p>
      <p>L'équipe ImmoAfric</p>
    `);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.warn(`Email non envoyé (pas de clé Resend) — sujet: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (error) {
      this.logger.error(`Erreur envoi email à ${to}: ${error}`);
    }
  }
}
