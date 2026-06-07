export interface RepositoryStateUpdater {
  updateLastSeenTag(
    repositoryId: string,
    previousLastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<void>;
}
