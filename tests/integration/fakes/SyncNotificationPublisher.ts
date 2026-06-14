import type { IMailer } from "../../../src/platform/integrations/ports/IMailer";
import type {
  NotifyNewReleasePayload,
  SendConfirmationPayload,
} from "../../../src/platform/messaging/messages/notificationJobs";
import type { INotificationPublisher } from "../../../src/platform/messaging/ports/INotificationPublisher";

export class SyncNotificationPublisher implements INotificationPublisher {
  constructor(private readonly mailer: IMailer) {}

  async publishNotifyNewRelease(data: NotifyNewReleasePayload): Promise<void> {
    await Promise.allSettled(
      data.subscribers.map((subscriber) =>
        this.mailer.sendReleaseEmail({
          to: subscriber.email,
          repo: data.repo,
          tag: data.tag,
          unsubscribeUrl: subscriber.unsubscribeUrl,
        }),
      ),
    );
  }

  async publishSendConfirmation(data: SendConfirmationPayload): Promise<void> {
    await this.mailer.sendConfirmationEmail(data);
  }
}
