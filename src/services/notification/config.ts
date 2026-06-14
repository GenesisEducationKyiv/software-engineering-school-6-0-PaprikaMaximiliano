import "dotenv/config";
import { z } from "zod";

const logLevelSchema = z.enum(["debug", "info", "warn", "error"]);

const notificationEnvSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  HEALTH_PORT: z.coerce.number().int().positive().default(3003),
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

export const notificationEnv = notificationEnvSchema.parse(process.env);
