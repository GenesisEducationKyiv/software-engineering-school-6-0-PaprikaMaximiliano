export interface IMailer {
  sendConfirmationEmail(input: {
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }): Promise<void>;

  sendReleaseEmail(input: {
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }): Promise<void>;
}
