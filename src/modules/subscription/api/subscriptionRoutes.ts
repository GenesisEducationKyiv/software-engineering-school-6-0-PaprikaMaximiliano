import type { FastifyInstance } from "fastify";
import { type ZodTypeProvider } from "fastify-type-provider-zod";
import type { SubscriptionService } from "../application/SubscriptionService";
import { subscribeRequestSchema, subscriptionsQuerySchema, tokenParamSchema } from "./schemas";

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
      const { email, repo } = request.body;
      await service.subscribe(request.body);
      request.log.info({ email, repository: repo }, "subscription created");
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
      request.log.info("subscription confirmed");
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
      request.log.info("subscription unsubscribed");
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
