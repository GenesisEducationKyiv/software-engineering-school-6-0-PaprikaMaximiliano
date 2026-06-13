import { GitHubNotFoundError, GitHubRateLimitError } from "../errors";
import { ISourceControlClient } from "./ports/ISourceControlClient";

function getResetRetryAfter(headers: Headers): number {
  const retryAfter = headers.get("retry-after");
  if (retryAfter) {
    const parsed = Number(retryAfter);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const reset = headers.get("x-ratelimit-reset");
  if (!reset) {
    return 60;
  }

  const resetEpoch = Number(reset);
  if (Number.isNaN(resetEpoch)) {
    return 60;
  }

  const now = Math.floor(Date.now() / 1000);
  return Math.max(resetEpoch - now, 1);
}

export class GitHubClient implements ISourceControlClient {
  constructor(private readonly token?: string) {}

  private async request(path: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "repo-release-notifier",
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(`https://api.github.com${path}`, {
      method: "GET",
      headers,
    });

    const remaining = response.headers.get("x-ratelimit-remaining");
    const isRateLimited = response.status === 429 || (response.status === 403 && remaining === "0");

    if (isRateLimited) {
      throw new GitHubRateLimitError({
        retryAfterSeconds: getResetRetryAfter(response.headers),
      });
    }

    return response;
  }

  async getLatestReleaseTag(fullName: string): Promise<string | null> {
    const response = await this.request(`/repos/${fullName}/releases/latest`);

    if (response.status === 404) {
      throw new GitHubNotFoundError();
    }

    if (!response.ok) {
      throw new Error(`GitHub release lookup failed with ${response.status}`);
    }

    const data = (await response.json()) as { tag_name?: string };
    return data.tag_name ?? null;
  }
}
