import type { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { subscriptionRoutes } from "../routes/subscriptionRoutes";
import { SubscriptionService } from "../services/SubscriptionService";
import { isAuthorizedApiKey } from "../utils/apiKey";

export function createApiRoutesPlugin(
  subscriptionService: SubscriptionService,
  apiKey: string | null | undefined,
) {
  return function apiRoutesPlugin(app: FastifyInstance): void {
    const typedApi = app.withTypeProvider<ZodTypeProvider>();

    typedApi.addHook("onRequest", async (request, reply) => {
      if (!apiKey) {
        return;
      }

      if (isAuthorizedApiKey(request.headers, apiKey)) {
        return;
      }

      return reply.code(401).send({ message: "Unauthorized" });
    });

    subscriptionRoutes(app, subscriptionService);
  };
}
