import type { IMailer } from "../../../../platform/integrations/ports/IMailer";
import type { ILogger } from "../../../../platform/logger/ILogger";
import type { NotifyNewReleasePayload } from "../../../../platform/messaging/messages/notificationJobs";

export async function handleNotifyNewRelease(
  mailer: IMailer,
  logger: ILogger,
  data: NotifyNewReleasePayload,
): Promise<void> {
  await Promise.allSettled(
    data.subscribers.map((subscriber) =>
      mailer.sendReleaseEmail({
        to: subscriber.email,
        repo: data.repo,
        tag: data.tag,
        unsubscribeUrl: subscriber.unsubscribeUrl,
      }),
    ),
  );

  logger.info({ repository: data.repo, tag: data.tag }, "new release notifications sent");
}
