import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseNotifier } from "../src/release/ReleaseNotifier";
import { IMailer } from "../src/integrations/ports/IMailer";
import { ILogger } from "../src/logger/ILogger";
import { Repository, Subscription } from "../src/models";

describe("ReleaseNotifier", () => {
  const mockMailer = {
    sendReleaseEmail: vi.fn(),
  } as unknown as IMailer;

  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;

  const appBaseUrl = "https://app.test.com";
  let notifier: ReleaseNotifier;

  beforeEach(() => {
    vi.clearAllMocks();
    notifier = new ReleaseNotifier(mockMailer, appBaseUrl, mockLogger);
  });

  it("should send emails to all subscribers with correctly formatted data", async () => {
    const mockSubscriptions: Subscription[] = [
      { email: "user1@test.com", unsubscribeToken: "token1" } as Subscription,
      { email: "user2@test.com", unsubscribeToken: "token2" } as Subscription,
    ];

    const mockRepo = {
      fullName: "facebook/react",
      subscriptions: mockSubscriptions,
    } as Repository & { subscriptions: Subscription[] };

    const tag = "v18.2.0";

    vi.mocked(mockMailer.sendReleaseEmail).mockResolvedValue(undefined);

    await notifier.notifySubscribers(mockRepo, tag);

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
    const mockRepo = {
      fullName: "empty/repo",
      subscriptions: [],
    } as unknown as Repository & { subscriptions: Subscription[] };

    await notifier.notifySubscribers(mockRepo, "v1.0.0");

    expect(mockMailer.sendReleaseEmail).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalled();
  });
});
