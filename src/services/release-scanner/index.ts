import "dotenv/config";
import Fastify from "fastify";
import { ReleaseScannerService } from "../../modules/release-scanner/application/ReleaseScannerService";
import { GitHubClient } from "../../platform/integrations/GithubClient";
import { Mailer } from "../../platform/integrations/Mailer";
import { createLogger } from "../../platform/logger/createLogger";
import { scannerEnv } from "./config";
import { HttpRepositoryStateUpdater } from "./infrastructure/HttpRepositoryStateUpdater";
import { HttpScanTargetProvider } from "./infrastructure/HttpScanTargetProvider";
import { SubscriptionApiClient } from "./infrastructure/SubscriptionApiClient";

const logger = createLogger({
  level: scannerEnv.LOG_LEVEL,
  pretty: scannerEnv.LOG_PRETTY ?? process.env.NODE_ENV !== "production",
  serviceName: "release-scanner",
});

const subscriptionApiClient = new SubscriptionApiClient(
  scannerEnv.SUBSCRIPTION_API_URL,
  scannerEnv.INTERNAL_API_KEY,
);

const scanner = new ReleaseScannerService(
  new GitHubClient(scannerEnv.GITHUB_TOKEN),
  new Mailer(scannerEnv.MAIL_FROM, {
    host: scannerEnv.SMTP_HOST,
    port: scannerEnv.SMTP_PORT,
    secure: scannerEnv.SMTP_SECURE,
    user: scannerEnv.SMTP_USER,
    pass: scannerEnv.SMTP_PASS,
  }),
  scannerEnv.SCAN_INTERVAL_MS,
  logger,
  new HttpScanTargetProvider(subscriptionApiClient),
  new HttpRepositoryStateUpdater(subscriptionApiClient),
);

const healthApp = Fastify({ logger: false });

healthApp.get("/health", () => ({ status: "ok" }));

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "shutting down release scanner");

  scanner.stop();
  await healthApp.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

try {
  await healthApp.listen({ port: scannerEnv.HEALTH_PORT, host: "0.0.0.0" });
  scanner.start();
  logger.info(
    { healthPort: scannerEnv.HEALTH_PORT, scanIntervalMs: scannerEnv.SCAN_INTERVAL_MS },
    "release scanner started",
  );
} catch (error) {
  logger.error({ error }, "failed to start release scanner");
  process.exit(1);
}
