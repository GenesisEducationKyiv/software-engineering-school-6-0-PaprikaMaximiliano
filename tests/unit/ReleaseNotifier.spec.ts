import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseNotifier } from "@/modules/release-scanner/application/ReleaseNotifier";
import { IMailer } from "@/platform/integrations/ports/IMailer";
import { ILogger } from "@/platform/logger/ILogger";
import type { ScanTarget } from "@/modules/subscription/contracts/scannerContracts";

describe("ReleaseNotifier", () => {
  const mockMailer = {
    sendReleaseEmail: vi.fn(),
  } as unknown as IMailer;

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;

  let notifier: ReleaseNotifier;

  beforeEach(() => {
    vi.clearAllMocks();
    notifier = new ReleaseNotifier(mockMailer, mockLogger);
  });

  it("should send emails to all subscribers with correctly formatted data", async () => {
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

    const tag = "v18.2.0";

    vi.mocked(mockMailer.sendReleaseEmail).mockResolvedValue(undefined);

    await notifier.notifySubscribers(mockTarget, tag);

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
      expect.objectContaining({ tag, repository: "facebook/react" }),
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

    await notifier.notifySubscribers(mockTarget, "v1.0.0");

    expect(mockMailer.sendReleaseEmail).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
