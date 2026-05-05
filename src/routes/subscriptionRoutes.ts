import type { FastifyInstance } from "fastify";
import {
  ResourceNotFoundError,
  SubscriptionConflictError,
  SubscriptionService,
  ValidationError,
} from "../services/subscriptionService.js";
import { isValidToken } from "../utils/validation.js";
import { GitHubRateLimitError } from "../integrations/githubClient.js";

export function subscriptionRoutes(
  app: FastifyInstance,
  service: SubscriptionService,
): void {
  app.post("/subscribe", async (request, reply) => {
    const body = request.body as { email?: string; repo?: string } | undefined;
    const email = body?.email?.trim() ?? "";
    const repo = body?.repo?.trim() ?? "";

    try {
      await service.subscribe({ email, repo });
      return reply
        .code(200)
        .send({ message: "Subscription successful. Confirmation email sent." });
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.code(400).send({ message: "Invalid input" });
      }
      if (error instanceof ResourceNotFoundError) {
        return reply
          .code(404)
          .send({ message: "Repository not found on GitHub" });
      }
      if (error instanceof SubscriptionConflictError) {
        return reply
          .code(409)
          .send({ message: "Email already subscribed to this repository" });
      }
      if (error instanceof GitHubRateLimitError) {
        return reply.code(503).send({
          message: "GitHub API rate limit reached. Please retry later.",
        });
      }
      throw error;
    }
  });

  app.get("/confirm/:token", async (request, reply) => {
    const token = (request.params as { token: string }).token;

    if (!isValidToken(token)) {
      return reply.code(400).send({ message: "Invalid token" });
    }

    try {
      await service.confirm(token);
      return reply
        .code(200)
        .send({ message: "Subscription confirmed successfully" });
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return reply.code(404).send({ message: "Token not found" });
      }
      throw error;
    }
  });

  app.get("/unsubscribe/:token", async (request, reply) => {
    const token = (request.params as { token: string }).token;

    if (!isValidToken(token)) {
      return reply.code(400).send({ message: "Invalid token" });
    }

    try {
      await service.unsubscribe(token);
      return reply.code(200).send({ message: "Unsubscribed successfully" });
    } catch (error) {
      if (error instanceof ResourceNotFoundError) {
        return reply.code(404).send({ message: "Token not found" });
      }
      throw error;
    }
  });

  app.get("/subscriptions", async (request, reply) => {
    const email = ((request.query as { email?: string }).email ?? "").trim();

    try {
      const subscriptions = await service.listByEmail(email);
      return reply.code(200).send(subscriptions);
    } catch (error) {
      if (error instanceof ValidationError) {
        return reply.code(400).send({ message: "Invalid email" });
      }
      throw error;
    }
  });
}
