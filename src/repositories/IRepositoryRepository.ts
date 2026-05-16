import { RepositoryWithSubscriptions } from "../models";

export interface IRepositoryRepository {
  getAllWithConfirmedSubscriptions(): Promise<RepositoryWithSubscriptions[]>;
  updateAllByIdAndLastSeenTag(
    id: string,
    lastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<{ count: number }>;
}
