import { Queue, QueueEvents } from "bullmq";
import {
  NOTIFICATION_JOB_NAMES,
  NOTIFICATION_QUEUE_NAME,
  type SendConfirmationPayload,
} from "../messages/notificationJobs";
import type { ISagaNotificationParticipant } from "../ports/ISagaNotificationParticipant";

const DEFAULT_TIMEOUT_MS = 30_000;

export class BullMqSagaNotificationParticipant implements ISagaNotificationParticipant {
  private readonly ready: Promise<void>;

  constructor(
    private readonly queue: Queue,
    private readonly queueEvents: QueueEvents,
    private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ) {
    this.ready = this.queueEvents.waitUntilReady().then(() => undefined);
  }

  async sendConfirmation(data: SendConfirmationPayload, sagaId: string): Promise<void> {
    await this.ready;

    const job = await this.queue.add(NOTIFICATION_JOB_NAMES.SEND_CONFIRMATION, {
      ...data,
      sagaId,
    });

    await job.waitUntilFinished(this.queueEvents, this.timeoutMs);
  }
}

export function createSagaNotificationQueueEvents(redisUrl: string): QueueEvents {
  return new QueueEvents(NOTIFICATION_QUEUE_NAME, {
    connection: { url: redisUrl },
  });
}

export function createSagaNotificationQueue(redisUrl: string): Queue {
  return new Queue(NOTIFICATION_QUEUE_NAME, {
    connection: { url: redisUrl },
  });
}
