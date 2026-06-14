import { Worker, type Job } from "bullmq";
import type { IMailer } from "@/platform/integrations/ports/IMailer";
import type { ILogger } from "@/platform/logger/ILogger";
import { createNotificationJobProcessor } from "@/modules/notification/application/NotificationConsumer";
import { NOTIFICATION_QUEUE_NAME } from "../messages/notificationJobs";

export function createNotificationWorker(
  redisUrl: string,
  mailer: IMailer,
  logger: ILogger,
): Worker {
  const processor = createNotificationJobProcessor(mailer, logger);

  return new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job) => {
      await processor(job.name, job.data);
    },
    {
      connection: { url: redisUrl },
    },
  );
}
