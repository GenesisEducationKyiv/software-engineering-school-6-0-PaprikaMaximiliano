import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseDetector } from "../src/release/ReleaseDetector";
import { ISourceControlClient } from "../src/integrations/ports/ISourceControlClient";
import { IRepositoryRepository } from "../src/repositories/IRepositoryRepository";
import { ReleaseNotifier } from "../src/release/ReleaseNotifier";
import { RateLimitPauser } from "../src/scheduling/RateLimitPauser";
import { ILogger } from "../src/logger/ILogger";
import { Repository, Subscription } from "../src/models";

describe("ReleaseDetector", () => {
  const mockGithubClient = {
    getLatestReleaseTag: vi.fn(),
  } as unknown as ISourceControlClient;

  const mockRepoRepository = {
    getAllWithConfirmedSubscriptions: vi.fn(),
    updateAllByIdAndLastSeenTag: vi.fn(),
  } as unknown as IRepositoryRepository;

  const mockNotifier = {
    notifySubscribers: vi.fn(),
  } as unknown as ReleaseNotifier;

  const mockRateLimitPauser = {
    isPaused: vi.fn(),
    pause: vi.fn(),
  } as unknown as RateLimitPauser;

  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as ILogger;

  let detector: ReleaseDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new ReleaseDetector(
      mockGithubClient,
      mockRepoRepository,
      mockNotifier,
      mockRateLimitPauser,
      mockLogger,
    );
  });

  it("should notify subscribers when a new release is detected", async () => {
    const mockRepo = {
      id: "repo-1",
      fullName: "owner/repo",
      lastSeenTag: "v1.0.0",
      subscriptions: [] as Subscription[],
    } as Repository & { subscriptions: Subscription[] };

    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(false);
    vi.mocked(mockRepoRepository.getAllWithConfirmedSubscriptions).mockResolvedValue([mockRepo]);
    vi.mocked(mockGithubClient.getLatestReleaseTag).mockResolvedValue("v1.1.0");
    vi.mocked(mockRepoRepository.updateAllByIdAndLastSeenTag).mockResolvedValue({ count: 1 });

    await detector.detectAndNotify();

    expect(mockRepoRepository.updateAllByIdAndLastSeenTag).toHaveBeenCalledWith(
      "repo-1",
      "v1.0.0",
      "v1.1.0",
    );

    expect(mockNotifier.notifySubscribers).toHaveBeenCalledExactlyOnceWith(mockRepo, "v1.1.0");
  });

  it("should skip processing if the rate limit pauser is active", async () => {
    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(true);

    await detector.detectAndNotify();

    expect(mockRepoRepository.getAllWithConfirmedSubscriptions).not.toHaveBeenCalled();
  });

  it("should not notify if the tag has not changed", async () => {
    const mockRepo = {
      fullName: "owner/repo",
      lastSeenTag: "v1.0.0",
    } as Repository & { subscriptions: Subscription[] };

    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(false);
    vi.mocked(mockRepoRepository.getAllWithConfirmedSubscriptions).mockResolvedValue([mockRepo]);
    vi.mocked(mockGithubClient.getLatestReleaseTag).mockResolvedValue("v1.0.0");

    await detector.detectAndNotify();

    expect(mockNotifier.notifySubscribers).not.toHaveBeenCalled();
    expect(mockRepoRepository.updateAllByIdAndLastSeenTag).not.toHaveBeenCalled();
  });
});
