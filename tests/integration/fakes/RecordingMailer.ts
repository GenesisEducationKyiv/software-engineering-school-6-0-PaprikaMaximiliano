import type { IMailer } from "../../../src/platform/integrations/ports/IMailer";

export class RecordingMailer implements IMailer {
  failNextConfirmation = false;

  confirmationEmails: Array<{
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }> = [];

  releaseEmails: Array<{
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }> = [];

  async sendConfirmationEmail(input: {
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    if (this.failNextConfirmation) {
      this.failNextConfirmation = false;
      throw new Error("Simulated confirmation email failure");
    }

    this.confirmationEmails.push(input);
    return Promise.resolve();
  }

  async sendReleaseEmail(input: {
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    this.releaseEmails.push(input);
    return Promise.resolve();
  }

  reset(): void {
    this.failNextConfirmation = false;
    this.confirmationEmails = [];
    this.releaseEmails = [];
  }
}
