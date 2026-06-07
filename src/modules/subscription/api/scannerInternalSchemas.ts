import { z } from "zod/v4";

export const repositoryIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const updateLastSeenTagBodySchema = z.object({
  previousLastSeenTag: z.string().nullable(),
  newLastSeenTag: z.string().min(1),
});
