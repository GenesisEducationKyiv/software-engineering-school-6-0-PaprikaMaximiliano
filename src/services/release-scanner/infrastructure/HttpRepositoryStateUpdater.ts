import { OptimisticLockError } from "../../../platform/errors";
import type { RepositoryStateUpdater } from "../../../modules/release-scanner/ports/RepositoryStateUpdater";
import type { SubscriptionApiClient } from "./SubscriptionApiClient";

export class HttpRepositoryStateUpdater implements RepositoryStateUpdater {
  constructor(private readonly client: SubscriptionApiClient) {}

  async updateLastSeenTag(
    repositoryId: string,
    previousLastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<void> {
    const response = await this.client.patch(
      `/internal/scanner/repositories/${repositoryId}/last-seen-tag`,
      {
        previousLastSeenTag,
        newLastSeenTag,
      },
    );

    if (response.status === 409) {
      throw new OptimisticLockError();
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Failed to update last seen tag: ${response.status}${body ? ` — ${body}` : ""}`);
    }
  }
}
