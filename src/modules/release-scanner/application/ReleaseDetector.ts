import type { ISourceControlClient } from "../../../platform/integrations/ports/ISourceControlClient";
import { GitHubRateLimitError, OptimisticLockError } from "../../../platform/errors";
import type { ILogger } from "../../../platform/logger/ILogger";
import { RateLimitPauser } from "../../../platform/scheduling/RateLimitPauser";
import type { ScanTarget } from "../../subscription/contracts/scannerContracts";
import type { RepositoryStateUpdater } from "../ports/RepositoryStateUpdater";
import type { ScanTargetProvider } from "../ports/ScanTargetProvider";
import { ReleaseNotifier } from "./ReleaseNotifier";

export class ReleaseDetector {
  constructor(
    private readonly githubClient: ISourceControlClient,
    private readonly scanTargetProvider: ScanTargetProvider,
    private readonly stateUpdater: RepositoryStateUpdater,
    private readonly notifier: ReleaseNotifier,
    private readonly rateLimitPauser: RateLimitPauser,
    private readonly logger: ILogger,
  ) {}

  async detectAndNotify(): Promise<void> {
    if (this.rateLimitPauser.isPaused()) {
      return;
    }

    const targets = await this.scanTargetProvider.listScanTargets();

    for (const target of targets) {
      try {
        await this.processTarget(target);
      } catch (error) {
        if (error instanceof GitHubRateLimitError) {
          this.rateLimitPauser.pause(error.info.retryAfterSeconds);
          this.logger.warn(
            { retryAfterSeconds: error.info.retryAfterSeconds },
            "paused due to GitHub rate limit",
          );
          return;
        }

        this.logger.error({ repository: target.fullName, error }, "failed to process repository");
      }
    }
  }

  private async processTarget(target: ScanTarget): Promise<void> {
    const latestTag = await this.githubClient.getLatestReleaseTag(target.fullName);

    if (!latestTag || target.lastSeenTag === latestTag) {
      return;
    }

    try {
      await this.stateUpdater.updateLastSeenTag(target.id, target.lastSeenTag, latestTag);
    } catch (error) {
      if (error instanceof OptimisticLockError) {
        this.logger.info(
          { repository: target.fullName },
          "skipped - already updated by another process",
        );
        return;
      }

      throw error;
    }

    await this.notifier.notifySubscribers(target, latestTag);
  }
}
