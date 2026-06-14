import type {
  NotifyNewReleasePayload,
  SendConfirmationPayload,
} from "../messages/notificationJobs";

export interface INotificationPublisher {
  publishNotifyNewRelease(data: NotifyNewReleasePayload): Promise<void>;
  publishSendConfirmation(data: SendConfirmationPayload): Promise<void>;
}
