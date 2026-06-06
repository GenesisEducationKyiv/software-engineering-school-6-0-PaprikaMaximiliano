import type { FastifyInstance } from "fastify";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

// Registers metrics on the root app instance (not as an encapsulated plugin) so
// onRequest/onResponse hooks capture all routes including /api/*.
// eslint-disable-next-line @typescript-eslint/require-await
export async function registerMetrics(app: FastifyInstance): Promise<void> {
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
}
