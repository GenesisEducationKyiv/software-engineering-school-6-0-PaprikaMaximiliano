import type { FastifyInstance } from "fastify";
import { SubscriptionService } from "../services/SubscriptionService";
import { subscribeRequestSchema, subscriptionsQuerySchema, tokenParamSchema } from "../schemas";
import { type ZodTypeProvider } from "fastify-type-provider-zod";

export function subscriptionRoutes(app: FastifyInstance, service: SubscriptionService): void {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/subscribe",
    {
      schema: {
        body: subscribeRequestSchema,
      },
    },
    async (request, reply) => {
      await service.subscribe(request.body);
      return reply.code(200).send({ message: "Subscription successful. Confirmation email sent." });
    },
  );

  typedApp.get(
    "/confirm/:token",
    {
      schema: {
        params: tokenParamSchema,
      },
    },
    async (request, reply) => {
      await service.confirm(request.params.token);
      return reply.code(200).send({ message: "Subscription confirmed successfully" });
    },
  );

  typedApp.get(
    "/unsubscribe/:token",
    {
      schema: {
        params: tokenParamSchema,
      },
    },
    async (request, reply) => {
      await service.unsubscribe(request.params.token);
      return reply.code(200).send({ message: "Unsubscribed successfully" });
    },
  );

  typedApp.get(
    "/subscriptions",
    {
      schema: {
        querystring: subscriptionsQuerySchema,
      },
    },
    async (request, reply) => {
      const subscriptions = await service.listByEmail(request.query.email);
      return reply.code(200).send(subscriptions);
    },
  );
}
