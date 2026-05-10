import { Repository, Subscription } from "../models";

export interface IRepositoryRepository {
  getAllWithConfirmedSubscriptions(): Promise<
    Array<Repository & { subscriptions: Subscription[] }>
  >;
  updateAllByIdAndLastSeenTag(
    id: string,
    lastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<{ count: number }>;
}
