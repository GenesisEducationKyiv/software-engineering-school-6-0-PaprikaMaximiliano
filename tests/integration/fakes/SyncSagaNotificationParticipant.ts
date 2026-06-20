import type { SendConfirmationPayload } from "../../../src/platform/messaging/messages/notificationJobs";
import type { ISagaNotificationParticipant } from "../../../src/platform/messaging/ports/ISagaNotificationParticipant";
import type { SyncNotificationPublisher } from "./SyncNotificationPublisher";

export class SyncSagaNotificationParticipant implements ISagaNotificationParticipant {
  constructor(private readonly notificationPublisher: SyncNotificationPublisher) {}

  async sendConfirmation(data: SendConfirmationPayload, sagaId: string): Promise<void> {
    await this.notificationPublisher.publishSendConfirmation({
      ...data,
      sagaId,
    });
  }
}
