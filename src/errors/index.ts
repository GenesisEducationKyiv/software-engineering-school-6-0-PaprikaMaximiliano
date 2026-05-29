export abstract class AppError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class SubscriptionConflictError extends AppError {
  readonly statusCode = 409;
}

export class ResourceNotFoundError extends AppError {
  readonly statusCode = 404;
}

export class ConflictError extends Error {}

export class GitHubRateLimitError extends Error {
  constructor(
    public readonly info: {
      retryAfterSeconds: number;
    },
  ) {
    super("GitHub API rate limit exceeded");
    this.name = "GitHubRateLimitError";
  }
}

export class GitHubNotFoundError extends Error {
  constructor(message = "Repository not found") {
    super(message);
    this.name = "GitHubNotFoundError";
  }
}
