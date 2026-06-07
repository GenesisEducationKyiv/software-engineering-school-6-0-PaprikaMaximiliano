import "dotenv/config";
import { z } from "zod";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const scannerEnvSchema = z.object({
  SUBSCRIPTION_API_URL: z.string().url(),
  INTERNAL_API_KEY: z.string().min(1),
  GITHUB_TOKEN: z.string().optional(),
  SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  HEALTH_PORT: z.coerce.number().int().positive().default(3002),
  LOG_LEVEL: logLevelSchema.optional(),
  LOG_PRETTY: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().default("noreply@release-notifier.local"),
});

export const scannerEnv = scannerEnvSchema.parse(process.env);
