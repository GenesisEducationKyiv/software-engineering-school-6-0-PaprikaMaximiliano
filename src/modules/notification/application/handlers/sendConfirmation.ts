import type { IMailer } from "../../../../platform/integrations/ports/IMailer";
import type { ILogger } from "../../../../platform/logger/ILogger";
import type { SendConfirmationPayload } from "../../../../platform/messaging/messages/notificationJobs";

export async function handleSendConfirmation(
  mailer: IMailer,
  logger: ILogger,
  data: SendConfirmationPayload,
): Promise<void> {
  await mailer.sendConfirmationEmail(data);
  logger.info({ to: data.to, repo: data.repo, sagaId: data.sagaId }, "confirmation email sent");
}
