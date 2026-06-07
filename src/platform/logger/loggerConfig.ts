import { ecsFormat } from "@elastic/ecs-pino-format";
import type { FastifyServerOptions } from "fastify";

const SERVICE_NAME = "repo-release-notifier";

export interface LoggerConfigOptions {
  level?: string;
  pretty?: boolean;
  serviceName?: string;
}

export function createLoggerConfig(
  options: LoggerConfigOptions = {},
): NonNullable<FastifyServerOptions["logger"]> {
  const level = options.level ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
  const serviceName = options.serviceName ?? SERVICE_NAME;

  return {
    level,
    ...ecsFormat({ convertReqRes: true }),
    base: {
      "service.name": serviceName,
      "service.environment": process.env.NODE_ENV ?? "development",
    },
    transport: options.pretty ? { target: "pino-pretty", options: { colorize: true } } : undefined,
  };
}
