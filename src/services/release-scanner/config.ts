import "dotenv/config";
import { z } from "zod";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const scannerEnvSchema = z.object({
  SUBSCRIPTION_API_URL: z.string().url(),
  SUBSCRIPTION_API_GRPC_URL: z.string().min(1).default("localhost:50051"),
  SCANNER_TRANSPORT: z.enum(["grpc", "http"]).default("grpc"),
  INTERNAL_API_KEY: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  HEALTH_PORT: z.coerce.number().int().positive().default(3002),
  LOG_LEVEL: logLevelSchema.optional(),
  LOG_PRETTY: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
});

export const scannerEnv = scannerEnvSchema.parse(process.env);
