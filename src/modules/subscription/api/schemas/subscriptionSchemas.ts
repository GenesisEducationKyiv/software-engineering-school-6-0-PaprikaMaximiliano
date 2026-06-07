import { z } from "zod/v4";
import { emailSchema, repoSchema, tokenSchema } from "./baseSchemas";

export const subscribeRequestSchema = z.object({
  email: emailSchema,
  repo: repoSchema,
});

export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export const subscriptionsQuerySchema = z.object({
  email: emailSchema,
});

export type SubscriptionsQuery = z.infer<typeof subscriptionsQuerySchema>;

export const tokenParamSchema = z.object({
  token: tokenSchema,
});

export type TokenParam = z.infer<typeof tokenParamSchema>;
