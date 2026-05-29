import Fastify from "fastify";
import formbody from "@fastify/formbody";
import sensible from "@fastify/sensible";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import { env } from "./config";
import { errorHandler } from "./errorHandler";
import { GitHubClient } from "./integrations/GithubClient";
import { Mailer } from "./integrations/Mailer";
import type { IMailer } from "./integrations/ports/IMailer";
import type { ISourceControlClient } from "./integrations/ports/ISourceControlClient";
import { subscriptionRoutes } from "./routes/subscriptionRoutes";
import { ReleaseScannerService } from "./services/ReleaseScanner";
import { SubscriptionService } from "./services/SubscriptionService";
import type { IRepositoryRepository } from "./repositories/IRepositoryRepository";
import { isAuthorizedApiKey } from "./utils/apiKey";
import { SubscriptionRepository } from "./repositories/prisma/SubscriptionRepository";
import { RepositoryRepository } from "./repositories/prisma/RepositoryRepository";
import type { ISubscriptionRepository } from "./repositories/ISubscriptionRepository";
import type { ITokenGenerator } from "./subscription/ports/ITokenGenerator";
import { UUIDTokenGenerator } from "./subscription/UUIDTokenGenerator";
import { SubscriptionUrlBuilder } from "./subscription/UrlBuilder";
import { RepoValidator } from "./subscription/RepoValidator";

export interface BuildAppOptions {
  apiKey?: string | null;
  appBaseUrl?: string;
  enableScanner?: boolean;
  githubClient?: ISourceControlClient;
  mailer?: IMailer;
  repositoryRepository?: IRepositoryRepository;
  subscriptionRepository?: ISubscriptionRepository;
  tokenGenerator?: ITokenGenerator;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const metricsRegistry = new Registry();
  collectDefaultMetrics({ register: metricsRegistry });

  const requestCount = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [metricsRegistry],
  });

  const requestDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 2, 5],
    registers: [metricsRegistry],
  });

  await app.register(sensible);
  await app.register(formbody);

  app.setErrorHandler(errorHandler);

  // Fastify's plugin system requires an async function, even if we don't have any async setup here
  // eslint-disable-next-line @typescript-eslint/require-await
  app.addHook("onRequest", async (request) => {
    request.raw.__requestStartAt = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    const start = request.raw.__requestStartAt;
    if (!start) {
      return;
    }

    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const route = request.routeOptions.url ?? "unknown";
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    };

    requestCount.inc(labels);
    requestDuration.observe(labels, elapsedSeconds);
  });

  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", metricsRegistry.contentType);
    return metricsRegistry.metrics();
  });

  const githubClient = options.githubClient ?? new GitHubClient(env.GITHUB_TOKEN);
  const mailer =
    options.mailer ??
    new Mailer(env.MAIL_FROM, {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  const subscriptionRepository = options.subscriptionRepository ?? new SubscriptionRepository();
  const tokenGenerator = options.tokenGenerator ?? new UUIDTokenGenerator();
  const appBaseUrl = options.appBaseUrl ?? env.APP_BASE_URL;

  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    mailer,
    tokenGenerator,
    new SubscriptionUrlBuilder(appBaseUrl),
    new RepoValidator(githubClient),
  );

  await app.register(
    (api) => {
      const typedApi = api.withTypeProvider<ZodTypeProvider>();
      const apiKey = options.apiKey ?? env.API_KEY;

      typedApi.addHook("onRequest", async (request, reply) => {
        if (!apiKey) {
          return;
        }

        if (isAuthorizedApiKey(request.headers, apiKey)) {
          return;
        }

        return reply.code(401).send({ message: "Unauthorized" });
      });

      subscriptionRoutes(api, subscriptionService);
    },
    { prefix: "/api" },
  );

  if (options.enableScanner !== false) {
    const repositoryRepository = options.repositoryRepository ?? new RepositoryRepository();
    const scanner = new ReleaseScannerService(
      githubClient,
      mailer,
      env.SCAN_INTERVAL_MS,
      appBaseUrl,
      app.log,
      repositoryRepository,
    );

    app.addHook("onReady", () => {
      scanner.start();
    });

    app.addHook("onClose", () => {
      scanner.stop();
    });
  }

  return app;
}
