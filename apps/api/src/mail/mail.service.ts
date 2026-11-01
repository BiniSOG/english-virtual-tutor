import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends transactional email through Resend (https://resend.com) using its REST API.
 * Without RESEND_API_KEY the message is logged instead (development), so flows still work locally.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(private readonly config: ConfigService) {}

  get configured() {
    return !!this.config.get<string>('RESEND_API_KEY');
  }

  async send(msg: MailMessage): Promise<boolean> {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      if (process.env.NODE_ENV === 'production') this.logger.error('RESEND_API_KEY is not set — email not sent');
      else this.logger.warn(`[dev] Email to ${msg.to}: ${msg.subject}\n${msg.text}`);
      return false;
    }
    const from = this.config.get<string>('EMAIL_FROM') || 'Lisan <onboarding@resend.dev>';
    const base = (this.config.get<string>('RESEND_API_URL') || 'https://api.resend.com').replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/emails`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
      });
      if (!res.ok) {
        this.logger.error(`Resend error ${res.status}: ${(await res.text()).slice(0, 300)}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Resend request failed: ${(err as Error).message}`);
      return false;
    }
  }
}
