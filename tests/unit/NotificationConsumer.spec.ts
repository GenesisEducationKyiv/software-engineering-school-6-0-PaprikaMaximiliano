import { describe, it, expect, vi, beforeEach } from "vitest";
import { createNotificationJobProcessor } from "@/modules/notification/application/NotificationConsumer";
import { NOTIFICATION_JOB_NAMES } from "@/platform/messaging/messages/notificationJobs";
import { IMailer } from "@/platform/integrations/ports/IMailer";
import { ILogger } from "@/platform/logger/ILogger";

describe("NotificationConsumer", () => {
  const mockMailer = {
    sendReleaseEmail: vi.fn(),
    sendConfirmationEmail: vi.fn(),
  } as unknown as IMailer;

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;

  let processJob: ReturnType<typeof createNotificationJobProcessor>;

  beforeEach(() => {
    vi.clearAllMocks();
    processJob = createNotificationJobProcessor(mockMailer, mockLogger);
  });

  describe("notify-new-release", () => {
    it("should send emails to all subscribers with correctly formatted data", async () => {
      vi.mocked(mockMailer.sendReleaseEmail).mockResolvedValue(undefined);

      await processJob(NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE, {
        repo: "facebook/react",
        tag: "v18.2.0",
        subscribers: [
          {
            email: "user1@test.com",
            unsubscribeUrl: "https://app.test.com/api/unsubscribe/token1",
          },
          {
            email: "user2@test.com",
            unsubscribeUrl: "https://app.test.com/api/unsubscribe/token2",
          },
        ],
      });

      expect(mockMailer.sendReleaseEmail).toHaveBeenCalledTimes(2);
      expect(mockMailer.sendReleaseEmail).toHaveBeenCalledWith({
        to: "user1@test.com",
        repo: "facebook/react",
        tag: "v18.2.0",
        unsubscribeUrl: "https://app.test.com/api/unsubscribe/token1",
      });
      expect(mockMailer.sendReleaseEmail).toHaveBeenCalledWith({
        to: "user2@test.com",
        repo: "facebook/react",
        tag: "v18.2.0",
        unsubscribeUrl: "https://app.test.com/api/unsubscribe/token2",
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ tag: "v18.2.0", repository: "facebook/react" }),
        expect.any(String),
      );
    });

    it("should handle a repository with no subscribers gracefully", async () => {
      await processJob(NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE, {
        repo: "empty/repo",
        tag: "v1.0.0",
        subscribers: [],
      });

      expect(mockMailer.sendReleaseEmail).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it("should still attempt all emails when one fails", async () => {
      vi.mocked(mockMailer.sendReleaseEmail)
        .mockRejectedValueOnce(new Error("SMTP failure"))
        .mockResolvedValueOnce(undefined);

      await processJob(NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE, {
        repo: "owner/repo",
        tag: "v2.0.0",
        subscribers: [
          {
            email: "fail@test.com",
            unsubscribeUrl: "https://app.test.com/api/unsubscribe/token1",
          },
          {
            email: "ok@test.com",
            unsubscribeUrl: "https://app.test.com/api/unsubscribe/token2",
          },
        ],
      });

      expect(mockMailer.sendReleaseEmail).toHaveBeenCalledTimes(2);
    });

    it("should reject invalid payload", async () => {
      await expect(
        processJob(NOTIFICATION_JOB_NAMES.NOTIFY_NEW_RELEASE, { repo: "owner/repo" }),
      ).rejects.toThrow();
    });
  });

  describe("send-confirmation", () => {
    it("should send confirmation email with correct data", async () => {
      vi.mocked(mockMailer.sendConfirmationEmail).mockResolvedValue(undefined);

      await processJob(NOTIFICATION_JOB_NAMES.SEND_CONFIRMATION, {
        to: "test@example.com",
        repo: "owner/repo",
        confirmUrl: "https://app.test.com/api/confirm/token",
        unsubscribeUrl: "https://app.test.com/api/unsubscribe/token",
      });

      expect(mockMailer.sendConfirmationEmail).toHaveBeenCalledWith({
        to: "test@example.com",
        repo: "owner/repo",
        confirmUrl: "https://app.test.com/api/confirm/token",
        unsubscribeUrl: "https://app.test.com/api/unsubscribe/token",
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ to: "test@example.com", repo: "owner/repo" }),
        expect.any(String),
      );
    });

    it("should reject invalid payload", async () => {
      await expect(
        processJob(NOTIFICATION_JOB_NAMES.SEND_CONFIRMATION, { to: "not-an-email" }),
      ).rejects.toThrow();
    });
  });

  it("should reject unknown job names", async () => {
    await expect(processJob("unknown-job", {})).rejects.toThrow("Unknown notification job");
  });
});
