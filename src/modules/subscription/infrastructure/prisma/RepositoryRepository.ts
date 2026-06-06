import type { Repository as PrismaRepository } from "@prisma/client";

import { OptimisticLockError, ResourceNotFoundError } from "../../../../platform/errors";
import { isPrismaNotFoundError } from "../../../../platform/errors/prismaErrors";
import { prisma } from "../../../../platform/persistence/prisma";
import type { Repository, RepositoryWithSubscriptions, Subscription } from "../../domain/models";
import type { IRepositoryRepository } from "../../domain/ports/IRepositoryRepository";

function toDomainRepository(repository: PrismaRepository): Repository {
  return {
    id: repository.id,
    owner: repository.owner,
    name: repository.name,
    fullName: repository.fullName,
    lastSeenTag: repository.lastSeenTag,
    createdAt: repository.createdAt,
    updatedAt: repository.updatedAt,
  };
}

function toDomainSubscription(subscription: {
  id: string;
  email: string;
  confirmed: boolean;
  confirmationToken: string;
  unsubscribeToken: string;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  repositoryId: string;
}): Subscription {
  return {
    id: subscription.id,
    email: subscription.email,
    confirmed: subscription.confirmed,
    confirmationToken: subscription.confirmationToken,
    unsubscribeToken: subscription.unsubscribeToken,
    confirmedAt: subscription.confirmedAt,
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt,
    repositoryId: subscription.repositoryId,
  };
}

export class RepositoryRepository implements IRepositoryRepository {
  async getAllWithConfirmedSubscriptions(): Promise<RepositoryWithSubscriptions[]> {
    const repositories = await prisma.repository.findMany({
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

    return repositories.map((repository) => ({
      ...toDomainRepository(repository),
      subscriptions: repository.subscriptions.map(toDomainSubscription),
    }));
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
      const updated = await prisma.repository.update({
        where: { id },
        data: {
          lastSeenTag: newLastSeenTag,
        },
      });
      return toDomainRepository(updated);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new ResourceNotFoundError("Repository not found");
      }

      throw error;
    }
  }
}
