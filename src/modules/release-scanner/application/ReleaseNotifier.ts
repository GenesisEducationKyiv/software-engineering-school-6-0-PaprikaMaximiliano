import type { IMailer } from "../../../platform/integrations/ports/IMailer";
import type { ILogger } from "../../../platform/logger/ILogger";
import type { ScanTarget } from "../../subscription/contracts/scannerContracts";

export class ReleaseNotifier {
  constructor(
    private readonly mailer: IMailer,
    private readonly logger: ILogger,
  ) {}

  async notifySubscribers(target: ScanTarget, tag: string): Promise<void> {
    await Promise.allSettled(
      target.subscribers.map((subscriber) =>
        this.mailer.sendReleaseEmail({
          to: subscriber.email,
          repo: target.fullName,
          tag,
          unsubscribeUrl: subscriber.unsubscribeUrl,
        }),
      ),
    );

    this.logger.info({ repository: target.fullName, tag }, "new release notifications sent");
  }
}
