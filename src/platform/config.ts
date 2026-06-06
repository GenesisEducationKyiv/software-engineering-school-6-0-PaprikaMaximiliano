import "dotenv/config";
import { z } from "zod";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: logLevelSchema.optional(),
  LOG_PRETTY: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  PORT: z.coerce.number().int().positive().default(3000),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  GITHUB_TOKEN: z.string().optional(),
  SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(60000),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().email().default("noreply@release-notifier.local"),
  API_KEY: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().min(1).optional()),
  INTERNAL_API_KEY: z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, z.string().min(1).optional()),
});
export const env = envSchema.parse(process.env);
