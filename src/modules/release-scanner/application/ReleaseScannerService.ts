import type { IMailer } from "../../../platform/integrations/ports/IMailer";
import type { ILogger } from "../../../platform/logger/ILogger";
import type { ISourceControlClient } from "../../../platform/integrations/ports/ISourceControlClient";
import { RateLimitPauser } from "../../../platform/scheduling/RateLimitPauser";
import { ScheduledTask } from "../../../platform/scheduling/ScheduledTask";
import type { RepositoryStateUpdater } from "../ports/RepositoryStateUpdater";
import type { ScanTargetProvider } from "../ports/ScanTargetProvider";
import { ReleaseDetector } from "./ReleaseDetector";
import { ReleaseNotifier } from "./ReleaseNotifier";

export class ReleaseScannerService {
  private readonly scheduledTask: ScheduledTask;

  constructor(
    githubClient: ISourceControlClient,
    mailer: IMailer,
    intervalMs: number,
    logger: ILogger,
    scanTargetProvider: ScanTargetProvider,
    stateUpdater: RepositoryStateUpdater,
  ) {
    const rateLimitPauser = new RateLimitPauser();
    const notifier = new ReleaseNotifier(mailer, logger);
    const detector = new ReleaseDetector(
      githubClient,
      scanTargetProvider,
      stateUpdater,
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
