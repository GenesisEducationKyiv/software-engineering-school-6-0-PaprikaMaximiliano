import { ILogger } from "../logger/ILogger";
import { ISourceControlClient } from "../integrations/ports/ISourceControlClient";
import { IRepositoryRepository } from "../repositories/IRepositoryRepository";
import { ReleaseNotifier } from "./ReleaseNotifier";
import { RateLimitPauser } from "../scheduling/RateLimitPauser";
import { Repository, Subscription } from "../models";
import { GitHubRateLimitError } from "../errors";

export class ReleaseDetector {
  constructor(
    private readonly githubClient: ISourceControlClient,
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly notifier: ReleaseNotifier,
    private readonly rateLimitPauser: RateLimitPauser,
    private readonly logger: ILogger,
  ) {}

  async detectAndNotify(): Promise<void> {
    if (this.rateLimitPauser.isPaused()) {
      return;
    }

    const repositories = await this.repositoryRepository.getAllWithConfirmedSubscriptions();

    for (const repo of repositories) {
      try {
        await this.processRepository(repo);
      } catch (error) {
        if (error instanceof GitHubRateLimitError) {
          this.rateLimitPauser.pause(error.info.retryAfterSeconds);
          this.logger.warn(
            { retryAfterSeconds: error.info.retryAfterSeconds },
            "paused due to GitHub rate limit",
          );
          return;
        }

        this.logger.error({ repository: repo.fullName, error }, "failed to process repository");
      }
    }
  }

  private async processRepository(
    repo: Repository & { subscriptions: Subscription[] },
  ): Promise<void> {
    const latestTag = await this.githubClient.getLatestReleaseTag(repo.fullName);

    if (!latestTag || repo.lastSeenTag === latestTag) {
      return;
    }

    const updated = await this.repositoryRepository.updateAllByIdAndLastSeenTag(
      repo.id,
      repo.lastSeenTag,
      latestTag,
    );

    if (updated.count === 0) {
      this.logger.info(
        { repository: repo.fullName },
        "skipped - already updated by another process",
      );
      return;
    }

    await this.notifier.notifySubscribers(repo, latestTag);
  }
}
