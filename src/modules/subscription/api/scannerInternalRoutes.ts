import type { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import type { ScannerAccessService } from "../application/ScannerAccessService";
import { repositoryIdParamSchema, updateLastSeenTagBodySchema } from "./scannerInternalSchemas";

export function scannerInternalRoutes(app: FastifyInstance, service: ScannerAccessService): void {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.get("/scan-targets", async (_request, reply) => {
    const targets = await service.listScanTargets();
    return reply.code(200).send(targets);
  });

  typedApp.patch(
    "/repositories/:id/last-seen-tag",
    {
      schema: {
        params: repositoryIdParamSchema,
        body: updateLastSeenTagBodySchema,
      },
    },
    async (request, reply) => {
      await service.updateLastSeenTag({
        repositoryId: request.params.id,
        previousLastSeenTag: request.body.previousLastSeenTag,
        newLastSeenTag: request.body.newLastSeenTag,
      });
      return reply.code(204).send();
    },
  );
}
