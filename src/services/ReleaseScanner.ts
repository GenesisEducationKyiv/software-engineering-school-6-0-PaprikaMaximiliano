import { ReleaseDetector } from "../release/ReleaseDetector";
import { ReleaseNotifier } from "../release/ReleaseNotifier";
import { RateLimitPauser } from "../scheduling/RateLimitPauser";
import { ScheduledTask } from "../scheduling/ScheduledTask";
import { IMailer } from "../integrations/ports/IMailer";
import { ISourceControlClient } from "../integrations/ports/ISourceControlClient";
import { IRepositoryRepository } from "../repositories/IRepositoryRepository";
import { ILogger } from "../logger/ILogger";

export class ReleaseScannerService {
  private readonly scheduledTask: ScheduledTask;

  constructor(
    githubClient: ISourceControlClient,
    mailer: IMailer,
    intervalMs: number,
    appBaseUrl: string,
    logger: ILogger,
    repositoryRepository: IRepositoryRepository,
  ) {
    const rateLimitPauser = new RateLimitPauser();
    const notifier = new ReleaseNotifier(mailer, appBaseUrl, logger);
    const detector = new ReleaseDetector(
      githubClient,
      repositoryRepository,
      notifier,
      rateLimitPauser,
      logger,
    );

    this.scheduledTask = new ScheduledTask(() => detector.detectAndNotify(), intervalMs, logger);
  }

  start(): void {
    this.scheduledTask.start();
  }

  stop(): void {
    this.scheduledTask.stop();
  }
}
