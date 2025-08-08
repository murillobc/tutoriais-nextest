import nodemailer from 'nodemailer';

export function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8);
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.setupTransporter();
  }

  private setupTransporter() {
    // Use environment variables for email configuration
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    };

    if (emailConfig.auth.user && emailConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(emailConfig);
    } else {
      console.warn('Email credentials not configured. Email functionality will be disabled.');
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    if (!this.transporter) {
      console.log(`Email not configured. Verification code for ${email}: ${code}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@nextest.com.br',
        to: email,
        subject: 'Código de Verificação - Portal Nextest',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0075C5 0%, #01283E 100%); padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; text-align: center; margin: 0;">Portal de Tutoriais Nextest</h1>
            </div>
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #01283E;">Seu código de verificação</h2>
              <p style="color: #666; font-size: 16px;">Use o código abaixo para fazer login no portal:</p>
              <div style="background: #f8f9fa; border: 2px dashed #60AB4B; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #01283E; letter-spacing: 8px;">${code}</span>
              </div>
              <p style="color: #666; font-size: 14px;">Este código expira em 10 minutos.</p>
              <p style="color: #666; font-size: 14px;">Se você não solicitou este código, pode ignorar este email.</p>
            </div>
          </div>
        `,
      });

      console.log(`Verification code sent to ${email}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Falha ao enviar email de verificação');
    }
  }
}

export const emailService = new EmailService();
