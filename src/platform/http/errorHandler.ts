import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { AppError, GitHubRateLimitError, OptimisticLockError } from "../errors";

export function errorHandler(
  error: Error | FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof AppError) {
    reply.code(error.statusCode).send({ message: error.message });
    return;
  }

  if (error instanceof OptimisticLockError) {
    reply.code(409).send({ message: error.message });
    return;
  }

  if (error instanceof GitHubRateLimitError) {
    reply.code(503).send({
      message: "GitHub API rate limit reached. Please retry later.",
    });
    return;
  }

  const fastifyError = error as FastifyError & { validation?: unknown };

  if (fastifyError.validation) {
    reply.code(400).send({ message: fastifyError.message });
    return;
  }

  if (typeof fastifyError.statusCode === "number" && fastifyError.statusCode >= 400) {
    reply.code(fastifyError.statusCode).send({ message: fastifyError.message });
    return;
  }

  request.log.error(
    { err: error, method: request.method, url: request.url, statusCode: 500 },
    "internal server error",
  );
  reply.code(500).send({ message: "Internal Server Error" });
}
