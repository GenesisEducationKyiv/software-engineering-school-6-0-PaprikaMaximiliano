export class SubscriptionUrlBuilder {
  constructor(private readonly appBaseUrl: string) {}

  buildConfirmUrl(token: string): string {
    return `${this.appBaseUrl}/api/confirm/${token}`;
  }

  buildUnsubscribeUrl(token: string): string {
    return `${this.appBaseUrl}/api/unsubscribe/${token}`;
  }
}
