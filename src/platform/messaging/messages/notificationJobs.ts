import { z } from "zod";

export const notifyNewReleaseSubscriberSchema = z.object({
  email: z.string().email(),
  unsubscribeUrl: z.string().url(),
});

export const notifyNewReleaseDataSchema = z.object({
  repo: z.string().min(1),
  tag: z.string().min(1),
  subscribers: z.array(notifyNewReleaseSubscriberSchema),
});

export const sendConfirmationDataSchema = z.object({
  to: z.string().email(),
  repo: z.string().min(1),
  confirmUrl: z.string().url(),
  unsubscribeUrl: z.string().url(),
});

export type NotifyNewReleasePayload = z.infer<typeof notifyNewReleaseDataSchema>;
export type SendConfirmationPayload = z.infer<typeof sendConfirmationDataSchema>;

export const NOTIFICATION_JOB_NAMES = {
  NOTIFY_NEW_RELEASE: "notify-new-release",
  SEND_CONFIRMATION: "send-confirmation",
} as const;

export type NotificationJobName =
  (typeof NOTIFICATION_JOB_NAMES)[keyof typeof NOTIFICATION_JOB_NAMES];

export const NOTIFICATION_QUEUE_NAME = "notifications";
