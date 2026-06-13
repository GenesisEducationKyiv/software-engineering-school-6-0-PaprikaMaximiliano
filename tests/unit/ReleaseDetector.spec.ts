import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReleaseDetector } from "@/modules/release-scanner/application/ReleaseDetector";
import { ISourceControlClient } from "@/platform/integrations/ports/ISourceControlClient";
import { ReleaseNotifier } from "@/modules/release-scanner/application/ReleaseNotifier";
import { RateLimitPauser } from "@/platform/scheduling/RateLimitPauser";
import { ILogger } from "@/platform/logger/ILogger";
import { OptimisticLockError } from "@/platform/errors";
import type { ScanTarget } from "@/modules/subscription/contracts/scannerContracts";
import type { ScanTargetProvider } from "@/modules/release-scanner/ports/ScanTargetProvider";
import type { RepositoryStateUpdater } from "@/modules/release-scanner/ports/RepositoryStateUpdater";

describe("ReleaseDetector", () => {
  const mockGithubClient = {
    getLatestReleaseTag: vi.fn(),
  } as unknown as ISourceControlClient;

  const mockScanTargetProvider = {
    listScanTargets: vi.fn(),
  } as unknown as ScanTargetProvider;

  const mockStateUpdater = {
    updateLastSeenTag: vi.fn(),
  } as unknown as RepositoryStateUpdater;

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
      mockScanTargetProvider,
      mockStateUpdater,
      mockNotifier,
      mockRateLimitPauser,
      mockLogger,
    );
  });

  it("should notify subscribers when a new release is detected", async () => {
    const mockTarget: ScanTarget = {
      id: "repo-1",
      fullName: "owner/repo",
      lastSeenTag: "v1.0.0",
      subscribers: [],
    };

    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(false);
    vi.mocked(mockScanTargetProvider.listScanTargets).mockResolvedValue([mockTarget]);
    vi.mocked(mockGithubClient.getLatestReleaseTag).mockResolvedValue("v1.1.0");
    vi.mocked(mockStateUpdater.updateLastSeenTag).mockResolvedValue(undefined);

    await detector.detectAndNotify();

    expect(mockStateUpdater.updateLastSeenTag).toHaveBeenCalledWith("repo-1", "v1.0.0", "v1.1.0");

    expect(mockNotifier.notifySubscribers).toHaveBeenCalledExactlyOnceWith(mockTarget, "v1.1.0");
  });

  it("should skip processing if the rate limit pauser is active", async () => {
    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(true);

    await detector.detectAndNotify();

    expect(mockScanTargetProvider.listScanTargets).not.toHaveBeenCalled();
  });

  it("should not notify if the tag has not changed", async () => {
    const mockTarget: ScanTarget = {
      id: "repo-1",
      fullName: "owner/repo",
      lastSeenTag: "v1.0.0",
      subscribers: [],
    };

    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(false);
    vi.mocked(mockScanTargetProvider.listScanTargets).mockResolvedValue([mockTarget]);
    vi.mocked(mockGithubClient.getLatestReleaseTag).mockResolvedValue("v1.0.0");

    await detector.detectAndNotify();

    expect(mockNotifier.notifySubscribers).not.toHaveBeenCalled();
    expect(mockStateUpdater.updateLastSeenTag).not.toHaveBeenCalled();
  });

  it("should not notify if another process already updated lastSeenTag", async () => {
    const mockTarget: ScanTarget = {
      id: "repo-1",
      fullName: "owner/repo",
      lastSeenTag: "v1.0.0",
      subscribers: [],
    };

    vi.mocked(mockRateLimitPauser.isPaused).mockReturnValue(false);
    vi.mocked(mockScanTargetProvider.listScanTargets).mockResolvedValue([mockTarget]);
    vi.mocked(mockGithubClient.getLatestReleaseTag).mockResolvedValue("v1.1.0");
    vi.mocked(mockStateUpdater.updateLastSeenTag).mockRejectedValue(new OptimisticLockError());

    await detector.detectAndNotify();

    expect(mockNotifier.notifySubscribers).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      { repository: "owner/repo" },
      "skipped - already updated by another process",
    );
  });
});
