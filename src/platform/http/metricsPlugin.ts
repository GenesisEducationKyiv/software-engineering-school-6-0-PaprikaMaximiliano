import type { FastifyInstance, FastifyRequest } from "fastify";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

function isMetricsRequest(request: FastifyRequest): boolean {
  if (request.routeOptions.url === "/metrics") {
    return true;
  }

  return request.url.split("?")[0] === "/metrics";
}

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

  const requestErrors = new Counter({
    name: "http_request_errors_total",
    help: "Total number of HTTP requests that returned a 5xx status code",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [metricsRegistry],
  });

  // Fastify's plugin system requires an async function, even if we don't have any async setup here
  // eslint-disable-next-line @typescript-eslint/require-await
  app.addHook("onRequest", async (request) => {
    if (isMetricsRequest(request)) {
      return;
    }

    request.raw.__requestStartAt = process.hrtime.bigint();
  });

  app.addHook("onResponse", async (request, reply) => {
    if (isMetricsRequest(request)) {
      return;
    }

    const start = request.raw.__requestStartAt;
    if (!start) {
      return;
    }

    const route = request.routeOptions.url ?? "unknown";

    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1_000_000_000;
    const labels = {
      method: request.method,
      route,
      status_code: String(reply.statusCode),
    };

    requestCount.inc(labels);
    requestDuration.observe(labels, elapsedSeconds);

    if (reply.statusCode >= 500) {
      requestErrors.inc(labels);
    }
  });

  app.get("/metrics", async (_, reply) => {
    reply.header("Content-Type", metricsRegistry.contentType);
    return metricsRegistry.metrics();
  });
}
