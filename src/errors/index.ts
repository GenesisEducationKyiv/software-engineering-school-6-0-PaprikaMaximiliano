export class SubscriptionConflictError extends Error {}
export class ResourceNotFoundError extends Error {}
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
