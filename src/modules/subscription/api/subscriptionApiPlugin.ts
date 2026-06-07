import type { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import { isAuthorizedApiKey } from "../../../platform/http/apiKey";
import type { SubscriptionService } from "../application/SubscriptionService";
import { subscriptionRoutes } from "./subscriptionRoutes";

export function createSubscriptionApiPlugin(
  subscriptionService: SubscriptionService,
  apiKey: string | null | undefined,
) {
  return function subscriptionApiPlugin(app: FastifyInstance): void {
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
