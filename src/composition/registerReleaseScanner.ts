import type { FastifyInstance } from "fastify";
import { env } from "../platform/config";
import { ReleaseScannerService } from "../modules/release-scanner/application/ReleaseScannerService";
import type { BuildAppOptions } from "./buildAppOptions";
import type { SubscriptionModule } from "./createSubscriptionModule";
import { asRepositoryStateUpdater, asScanTargetProvider } from "./scannerPortAdapters";

export function registerReleaseScanner(
  app: FastifyInstance,
  options: BuildAppOptions,
  subscriptionModule: SubscriptionModule,
): void {
  if (options.enableScanner === false) {
    return;
  }

  const scanTargetProvider = asScanTargetProvider(subscriptionModule.scannerAccessService);
  const stateUpdater = asRepositoryStateUpdater(subscriptionModule.scannerAccessService);

  const scanner = new ReleaseScannerService(
    subscriptionModule.githubClient,
    subscriptionModule.mailer,
    env.SCAN_INTERVAL_MS,
    app.log,
    scanTargetProvider,
    stateUpdater,
  );

  app.addHook("onReady", () => {
    scanner.start();
  });

  app.addHook("onClose", () => {
    scanner.stop();
  });
}
