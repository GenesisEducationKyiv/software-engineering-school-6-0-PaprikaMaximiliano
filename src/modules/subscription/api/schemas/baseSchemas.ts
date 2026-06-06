import { z } from "zod/v4";

export const emailSchema = z.string().email("Invalid email format").trim();

export const repoSchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Repository must be in format: owner/name")
  .trim();

export const tokenSchema = z.string().uuid("Invalid token format").trim();
