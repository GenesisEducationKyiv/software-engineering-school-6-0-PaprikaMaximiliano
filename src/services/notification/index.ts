import "dotenv/config";
import Fastify from "fastify";
import type { Worker } from "bullmq";
import { Mailer } from "../../platform/integrations/Mailer";
import { createNotificationWorker } from "../../platform/messaging/bullmq/createNotificationWorker";
import { createLogger } from "../../platform/logger/createLogger";
import { notificationEnv } from "./config";

const logger = createLogger({
  level: notificationEnv.LOG_LEVEL,
  pretty: notificationEnv.LOG_PRETTY ?? process.env.NODE_ENV !== "production",
  serviceName: "notification",
});

const mailer = new Mailer(notificationEnv.MAIL_FROM, {
  host: notificationEnv.SMTP_HOST,
  port: notificationEnv.SMTP_PORT,
  secure: notificationEnv.SMTP_SECURE,
  user: notificationEnv.SMTP_USER,
  pass: notificationEnv.SMTP_PASS,
});

const worker: Worker = createNotificationWorker(notificationEnv.REDIS_URL, mailer, logger);

const healthApp = Fastify({ logger: false });

healthApp.get("/health", () => ({ status: "ok" }));

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, "shutting down notification worker");

  await worker.close();
  await healthApp.close();
  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

worker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, jobName: job?.name, error }, "notification job failed");
});

worker.on("completed", (job) => {
  logger.info({ jobId: job.id, jobName: job.name }, "notification job completed");
});

try {
  await healthApp.listen({ port: notificationEnv.HEALTH_PORT, host: "0.0.0.0" });
  logger.info({ healthPort: notificationEnv.HEALTH_PORT }, "notification worker started");
} catch (error) {
  logger.error({ error }, "failed to start notification worker");
  process.exit(1);
}
