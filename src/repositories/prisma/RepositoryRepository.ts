import { Repository } from "@prisma/client";

import { OptimisticLockError, ResourceNotFoundError } from "../../errors";
import { isPrismaNotFoundError } from "../../errors/prismaErrors";
import { prisma } from "../../lib/prisma.js";
import { RepositoryWithSubscriptions } from "../../models";

import { IRepositoryRepository } from "../IRepositoryRepository";

export class RepositoryRepository implements IRepositoryRepository {
  async getAllWithConfirmedSubscriptions(): Promise<RepositoryWithSubscriptions[]> {
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

  async updateByIdAndLastSeenTag(
    id: string,
    lastSeenTag: string | null,
    newLastSeenTag: string,
  ): Promise<Repository> {
    const existing = await prisma.repository.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ResourceNotFoundError("Repository not found");
    }

    if (existing.lastSeenTag !== lastSeenTag) {
      throw new OptimisticLockError();
    }

    try {
      return await prisma.repository.update({
        where: { id },
        data: {
          lastSeenTag: newLastSeenTag,
        },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new ResourceNotFoundError("Repository not found");
      }

      throw error;
    }
  }
}
