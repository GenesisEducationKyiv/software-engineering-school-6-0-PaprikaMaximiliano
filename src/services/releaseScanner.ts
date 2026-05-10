import { ReleaseDetector } from "../release/ReleaseDetetector.js";
import { ReleaseNotifier } from "../release/ReleaseNotifier.js";
import { RateLimitPauser } from "../scheduling/RateLimitPauser.js";
import { ScheduledTask } from "../scheduling/ScheduledTask.js";
import { IMailer } from "../integrations/ports/IMailer.js";
import { ISourceControlClient } from "../integrations/ports/ISourceControlClient.js";
import { IRepositoryRepository } from "../repositories/IRepositoryRepository.js";
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
