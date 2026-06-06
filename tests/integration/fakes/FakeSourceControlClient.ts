import { GitHubNotFoundError, GitHubRateLimitError } from "../../../src/errors";
import type { ISourceControlClient } from "../../../src/integrations/ports/ISourceControlClient";
import { TEST_TAG } from "../constants";

export class FakeSourceControlClient implements ISourceControlClient {
  mode: "success" | "not-found" | "rate-limit" = "success";

  async getLatestReleaseTag(_: string): Promise<string | null> {
    if (this.mode === "not-found") {
      throw new GitHubNotFoundError();
    }

    if (this.mode === "rate-limit") {
      throw new GitHubRateLimitError({ retryAfterSeconds: 60 });
    }

    return Promise.resolve(TEST_TAG);
  }

  reset(): void {
    this.mode = "success";
  }
}
