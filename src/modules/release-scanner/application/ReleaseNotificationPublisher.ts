import type { ILogger } from "../../../platform/logger/ILogger";
import type { INotificationPublisher } from "../../../platform/messaging/ports/INotificationPublisher";
import type { ScanTarget } from "../../subscription/contracts/scannerContracts";

export class ReleaseNotificationPublisher {
  constructor(
    private readonly publisher: INotificationPublisher,
    private readonly logger: ILogger,
  ) {}

  async notifySubscribers(target: ScanTarget, tag: string): Promise<void> {
    await this.publisher.publishNotifyNewRelease({
      repo: target.fullName,
      tag,
      subscribers: target.subscribers.map((subscriber) => ({
        email: subscriber.email,
        unsubscribeUrl: subscriber.unsubscribeUrl,
      })),
    });

    this.logger.info({ repository: target.fullName, tag }, "new release notification job enqueued");
  }
}
