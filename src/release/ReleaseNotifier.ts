import { IMailer } from "../integrations/ports/IMailer";
import { ILogger } from "../logger/ILogger";
import { Repository, Subscription } from "../models";

export class ReleaseNotifier {
  constructor(
    private readonly mailer: IMailer,
    private readonly appBaseUrl: string,
    private readonly logger: ILogger,
  ) {}

  async notifySubscribers(
    repo: Repository & { subscriptions: Subscription[] },
    tag: string,
  ): Promise<void> {
    await Promise.all(
      repo.subscriptions.map((subscription) =>
        this.mailer.sendReleaseEmail({
          to: subscription.email,
          repo: repo.fullName,
          tag: tag,
          unsubscribeUrl: `${this.appBaseUrl}/api/unsubscribe/${subscription.unsubscribeToken}`,
        }),
      ),
    );

    this.logger.info({ repository: repo.fullName, tag }, "new release notifications sent");
  }
}
