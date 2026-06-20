import type { SendConfirmationPayload } from "../messages/notificationJobs";

export interface ISagaNotificationParticipant {
  sendConfirmation(data: SendConfirmationPayload, sagaId: string): Promise<void>;
}
