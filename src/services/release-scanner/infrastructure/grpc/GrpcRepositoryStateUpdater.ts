import type { RepositoryStateUpdater } from "@/modules/release-scanner/ports/RepositoryStateUpdater";
import type { GrpcSubscriptionApiClient } from "./GrpcSubscriptionApiClient";

export class GrpcRepositoryStateUpdater implements RepositoryStateUpdater {
  constructor(private readonly client: GrpcSubscriptionApiClient) {}

  async updateLastSeenTag(
    repositoryId: string,
    previousLastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<void> {
    await this.client.updateLastSeenTag({
      repositoryId,
      previousLastSeenTag: previousLastSeenTag ?? undefined,
      newLastSeenTag,
    });
  }
}
