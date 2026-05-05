import { prisma } from "../lib/prisma.js";
import { GitHubRateLimitError, type GitHubClient } from "../integrations/githubClient.js";
import type { Mailer } from "../integrations/mailer.js";

type Logger = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
};

export class ReleaseScanner {
  private timer: NodeJS.Timeout | null = null;
  private pauseUntil = 0;

  constructor(
    private readonly githubClient: GitHubClient,
    private readonly mailer: Mailer,
    private readonly intervalMs: number,
    private readonly appBaseUrl: string,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (this.timer) {
      return;
    }

    const run = async () => {
      await this.scanOnce();
      this.timer = setTimeout(() => void run(), this.intervalMs);
    };

    void run();
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  async scanOnce(): Promise<void> {
    if (Date.now() < this.pauseUntil) {
      return;
    }

    const repositories = await prisma.repository.findMany({
      where: {
        subscriptions: {
          some: {
            confirmed: true,
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            confirmed: true,
          },
        },
      },
    });

    for (const repo of repositories) {
      try {
        const latestTag = await this.githubClient.getLatestReleaseTag(repo.fullName);

        if (!latestTag) {
          continue;
        }

        if (repo.lastSeenTag === latestTag) {
          continue;
        }

        const updated = await prisma.repository.updateMany({
          where: {
            id: repo.id,
            lastSeenTag: repo.lastSeenTag,
          },
          data: {
            lastSeenTag: latestTag,
          },
        });

        if (updated.count === 0) {
          this.logger.info(
            { repository: repo.fullName },
            "skipped - already updated by another process",
          );
          continue;
        }

        await Promise.all(
          repo.subscriptions.map((subscription) =>
            this.mailer.sendReleaseEmail({
              to: subscription.email,
              repo: repo.fullName,
              tag: latestTag,
              unsubscribeUrl: `${this.appBaseUrl}/api/unsubscribe/${subscription.unsubscribeToken}`,
            }),
          ),
        );

        this.logger.info(
          { repository: repo.fullName, tag: latestTag },
          "new release notifications sent",
        );
      } catch (error) {
        if (error instanceof GitHubRateLimitError) {
          const pauseMs = error.info.retryAfterSeconds * 1000;
          this.pauseUntil = Date.now() + pauseMs;
          this.logger.warn(
            { retryAfterSeconds: error.info.retryAfterSeconds },
            "scanner paused due to GitHub rate limit",
          );
          return;
        }

        this.logger.error({ repository: repo.fullName, error }, "failed to scan repository");
      }
    }
  }
}
