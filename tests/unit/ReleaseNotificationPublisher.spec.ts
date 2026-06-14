import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseNotificationPublisher } from "@/modules/release-scanner/application/ReleaseNotificationPublisher";
import { INotificationPublisher } from "@/platform/messaging/ports/INotificationPublisher";
import { ILogger } from "@/platform/logger/ILogger";
import type { ScanTarget } from "@/modules/subscription/contracts/scannerContracts";

describe("ReleaseNotificationPublisher", () => {
  const mockPublisher = {
    publishNotifyNewRelease: vi.fn(),
    publishSendConfirmation: vi.fn(),
  } as unknown as INotificationPublisher;

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;

  let publisher: ReleaseNotificationPublisher;

  beforeEach(() => {
    vi.clearAllMocks();
    publisher = new ReleaseNotificationPublisher(mockPublisher, mockLogger);
  });

  it("should enqueue a notify-new-release job with subscriber data", async () => {
    const mockTarget: ScanTarget = {
      id: "repo-1",
      fullName: "facebook/react",
      lastSeenTag: "v18.0.0",
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
    };

    vi.mocked(mockPublisher.publishNotifyNewRelease).mockResolvedValue(undefined);

    await publisher.notifySubscribers(mockTarget, "v18.2.0");

    expect(mockPublisher.publishNotifyNewRelease).toHaveBeenCalledWith({
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

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ tag: "v18.2.0", repository: "facebook/react" }),
      expect.any(String),
    );
  });

  it("should handle a repository with no subscribers gracefully", async () => {
    const mockTarget: ScanTarget = {
      id: "repo-1",
      fullName: "empty/repo",
      lastSeenTag: null,
      subscribers: [],
    };

    await publisher.notifySubscribers(mockTarget, "v1.0.0");

    expect(mockPublisher.publishNotifyNewRelease).toHaveBeenCalledWith({
      repo: "empty/repo",
      tag: "v1.0.0",
      subscribers: [],
    });
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
