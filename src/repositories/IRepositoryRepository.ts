import { Repository } from "@prisma/client";
import { RepositoryWithSubscriptions } from "../models";

export interface IRepositoryRepository {
  getAllWithConfirmedSubscriptions(): Promise<RepositoryWithSubscriptions[]>;
  updateByIdAndLastSeenTag(
    id: string,
    lastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<Repository>;
}
