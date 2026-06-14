import type { IMailer } from "../../../platform/integrations/ports/IMailer";
import type { ILogger } from "../../../platform/logger/ILogger";
import {
  NOTIFICATION_JOB_NAMES,
  notifyNewReleaseDataSchema,
  sendConfirmationDataSchema,
} from "../../../platform/messaging/messages/notificationJobs";
import { handleNotifyNewRelease } from "./handlers/notifyNewRelease";
import { handleSendConfirmation } from "./handlers/sendConfirmation";

export function createNotificationJobProcessor(mailer: IMailer, logger: ILogger) {
  return async (jobName: string, data: unknown): Promise<void> => {
    switch (jobName) {
      case NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE: {
        const payload = notifyNewReleaseDataSchema.parse(data);
        await handleNotifyNewRelease(mailer, logger, payload);
        return;
      }
      case NOTIFICATION_JOB_NAMES.SEND_CONFIRMATION: {
        const payload = sendConfirmationDataSchema.parse(data);
        await handleSendConfirmation(mailer, logger, payload);
        return;
      }
      default:
        throw new Error(`Unknown notification job: ${jobName}`);
    }
  };
}
