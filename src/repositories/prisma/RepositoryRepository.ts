import { Repository, Subscription } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

import { IRepositoryRepository } from "../IRepositoryRepository";

export class RepositoryRepository implements IRepositoryRepository {
  async getAllWithConfirmedSubscriptions(): Promise<
    Array<Repository & { subscriptions: Subscription[] }>
  > {
    return await prisma.repository.findMany({
      where: {
        subscriptions: {
          some: {
            confirmed: true,
          },
        },
      },
      include: {
        subscriptions: {
          where: {
            confirmed: true,
          },
        },
      },
    });
  }

  async updateAllByIdAndLastSeenTag(
    id: string,
    lastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<{ count: number }> {
    return await prisma.repository.updateMany({
      where: {
        id: id,
        lastSeenTag: lastSeenTag,
      },
      data: {
        lastSeenTag: newLastSeenTag,
      },
    });
  }
}
