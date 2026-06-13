import nodemailer, { type Transporter } from "nodemailer";
import { IMailer } from "./ports/IMailer";

export class Mailer implements IMailer {
  private readonly transporter: Transporter;

  constructor(
    private readonly from: string,
    smtpConfig: {
      host?: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
    },
  ) {
    if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
      this.transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendConfirmationEmail(input: {
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `Confirm subscription for ${input.repo}`,
      text: `Please confirm your subscription for ${input.repo}: ${input.confirmUrl}\n\nIf this wasn't you, unsubscribe here: ${input.unsubscribeUrl}`,
    });
  }

  async sendReleaseEmail(input: {
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: input.to,
      subject: `New release for ${input.repo}: ${input.tag}`,
      text: `A new release was detected for ${input.repo}. Tag: ${input.tag}\n\nUnsubscribe: ${input.unsubscribeUrl}`,
    });
  }
}
