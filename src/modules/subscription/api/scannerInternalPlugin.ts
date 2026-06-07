import type { FastifyInstance } from "fastify";
import { isAuthorizedApiKey } from "../../../platform/http/apiKey";
import type { ScannerAccessService } from "../application/ScannerAccessService";
import { scannerInternalRoutes } from "./scannerInternalRoutes";

export function createScannerInternalPlugin(
  scannerAccessService: ScannerAccessService,
  internalApiKey: string | null | undefined,
) {
  return function scannerInternalPlugin(app: FastifyInstance): void {
    app.addHook("onRequest", async (request, reply) => {
      if (!internalApiKey) {
        return reply.code(503).send({ message: "Internal scanner API is not configured" });
      }

      if (isAuthorizedApiKey(request.headers, internalApiKey)) {
        return;
      }

      return reply.code(401).send({ message: "Unauthorized" });
    });

    scannerInternalRoutes(app, scannerAccessService);
  };
}
