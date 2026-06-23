import "dotenv/config";
import Fastify from "fastify";
import { ReleaseScannerService } from "../../modules/release-scanner/application/ReleaseScannerService";
import { GitHubClient } from "../../platform/integrations/GithubClient";
import {
  BullMqNotificationPublisher,
  createNotificationQueue,
} from "../../platform/messaging/bullmq/BullMqNotificationPublisher";
import { createLogger } from "../../platform/logger/createLogger";
import { scannerEnv } from "./config";
import { HttpRepositoryStateUpdater } from "./infrastructure/HttpRepositoryStateUpdater";
import { HttpScanTargetProvider } from "./infrastructure/HttpScanTargetProvider";
import { GrpcRepositoryStateUpdater } from "./infrastructure/grpc/GrpcRepositoryStateUpdater";
import { GrpcScanTargetProvider } from "./infrastructure/grpc/GrpcScanTargetProvider";
import { GrpcSubscriptionApiClient } from "./infrastructure/grpc/GrpcSubscriptionApiClient";
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

const grpcSubscriptionApiClient = new GrpcSubscriptionApiClient(
  scannerEnv.SUBSCRIPTION_API_GRPC_URL,
  scannerEnv.INTERNAL_API_KEY,
);

const useGrpc = scannerEnv.SCANNER_TRANSPORT === "grpc";

const scanTargetProvider = useGrpc
  ? new GrpcScanTargetProvider(grpcSubscriptionApiClient)
  : new HttpScanTargetProvider(subscriptionApiClient);

const repositoryStateUpdater = useGrpc
  ? new GrpcRepositoryStateUpdater(grpcSubscriptionApiClient)
  : new HttpRepositoryStateUpdater(subscriptionApiClient);

const notificationPublisher = new BullMqNotificationPublisher(
  createNotificationQueue(scannerEnv.REDIS_URL),
);

const scanner = new ReleaseScannerService(
  new GitHubClient(scannerEnv.GITHUB_TOKEN),
  notificationPublisher,
  scannerEnv.SCAN_INTERVAL_MS,
  logger,
  scanTargetProvider,
  repositoryStateUpdater,
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
  if (useGrpc) {
    grpcSubscriptionApiClient.close();
  }
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
    {
      healthPort: scannerEnv.HEALTH_PORT,
      scanIntervalMs: scannerEnv.SCAN_INTERVAL_MS,
      transport: scannerEnv.SCANNER_TRANSPORT,
    },
    "release scanner started",
  );
} catch (error) {
  logger.error({ error }, "failed to start release scanner");
  process.exit(1);
}
