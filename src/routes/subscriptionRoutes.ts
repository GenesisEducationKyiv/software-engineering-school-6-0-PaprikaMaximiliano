import type { FastifyInstance } from "fastify";
import { ResourceNotFoundError, SubscriptionConflictError } from "../errors";
import { SubscriptionService } from "../services/subscriptionService";
import { subscribeRequestSchema, subscriptionsQuerySchema, tokenParamSchema } from "../schemas";
import { GitHubRateLimitError } from "../errors";
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
      try {
        await service.subscribe(request.body);
        return reply
          .code(200)
          .send({ message: "Subscription successful. Confirmation email sent." });
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.code(404).send({ message: "Repository not found on GitHub" });
        }
        if (error instanceof SubscriptionConflictError) {
          return reply.code(409).send({ message: "Email already subscribed to this repository" });
        }
        if (error instanceof GitHubRateLimitError) {
          return reply.code(503).send({
            message: "GitHub API rate limit reached. Please retry later.",
          });
        }
        throw error;
      }
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
      try {
        const token = request.params.token;
        await service.confirm(token);
        return reply.code(200).send({ message: "Subscription confirmed successfully" });
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.code(404).send({ message: "Token not found" });
        }
        throw error;
      }
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
      try {
        const token = request.params.token;

        await service.unsubscribe(token);
        return reply.code(200).send({ message: "Unsubscribed successfully" });
      } catch (error) {
        if (error instanceof ResourceNotFoundError) {
          return reply.code(404).send({ message: "Token not found" });
        }
        throw error;
      }
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
      const email = request.query.email;
      const subscriptions = await service.listByEmail(email);
      return reply.code(200).send(subscriptions);
    },
  );
}
