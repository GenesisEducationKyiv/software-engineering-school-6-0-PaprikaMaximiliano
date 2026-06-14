import { Queue } from "bullmq";
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_QUEUE_NAME,
  type NotifyNewReleasePayload,
  type SendConfirmationPayload,
} from "../messages/notificationJobs";
import type { INotificationPublisher } from "../ports/INotificationPublisher";

export class BullMqNotificationPublisher implements INotificationPublisher {
  constructor(private readonly queue: Queue) {}

  async publishNotifyNewRelease(data: NotifyNewReleasePayload): Promise<void> {
    await this.queue.add(NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE, data);
  }

  async publishSendConfirmation(data: SendConfirmationPayload): Promise<void> {
    await this.queue.add(NOTIFICATION_JOB_NAMES.SEND_CONFIRMATION, data);
  }
}

export function createNotificationQueue(redisUrl: string): Queue {
  return new Queue(NOTIFICATION_QUEUE_NAME, {
    connection: { url: redisUrl },
  });
}
