import { Prisma } from "@prisma/client";
import type {
  Repository as PrismaRepository,
  Subscription as PrismaSubscription,
} from "@prisma/client";

import { ResourceNotFoundError } from "../../../../platform/errors";
import { isPrismaNotFoundError } from "../../../../platform/errors/prismaErrors";
import { prisma } from "../../../../platform/persistence/prisma";
import { SubscriptionAlreadyExistsError } from "../../domain/errors/SubscriptionAlreadyExistsError";
import type { Repository, Subscription, SubscriptionWithRepository } from "../../domain/models";
import type {
  CreateSubscriptionDTO,
  ISubscriptionRepository,
} from "../../domain/ports/ISubscriptionRepository";

function toDomainSubscription(subscription: PrismaSubscription): Subscription {
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

export class SubscriptionRepository implements ISubscriptionRepository {
  async create(createSubscriptionDto: CreateSubscriptionDTO): Promise<Subscription> {
    try {
      const { email, repo, owner, name, latestTag, confirmationToken, unsubscribeToken } =
        createSubscriptionDto;
      const created = await prisma.subscription.create({
        data: {
          email,
          confirmationToken,
          unsubscribeToken,
          repository: {
            connectOrCreate: {
              where: { fullName: repo },
              create: {
                fullName: repo,
                owner,
                name,
                lastSeenTag: latestTag,
              },
            },
          },
        },
      });
      return toDomainSubscription(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new SubscriptionAlreadyExistsError();
        }
      }

      throw error;
    }
  }

  async getByConfirmationToken(token: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findUnique({
      where: { confirmationToken: token },
    });
    return subscription ? toDomainSubscription(subscription) : null;
  }

  async confirmById(id: string): Promise<Subscription> {
    try {
      const subscription = await prisma.subscription.update({
        where: { id },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
        },
      });
      return toDomainSubscription(subscription);
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new ResourceNotFoundError("Subscription not found");
      }

      throw error;
    }
  }

  async deleteByUnsubscribeToken(token: string): Promise<void> {
    try {
      await prisma.subscription.delete({
        where: { unsubscribeToken: token },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new ResourceNotFoundError("Subscription with unsubscribe token not found");
      }

      throw error;
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await prisma.subscription.delete({
        where: { id },
      });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        throw new ResourceNotFoundError("Subscription not found");
      }

      throw error;
    }
  }

  async getAllByEmail(email: string): Promise<SubscriptionWithRepository[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { email },
      include: { repository: true },
      orderBy: { createdAt: "desc" },
    });

    return subscriptions.map((subscription) => ({
      ...toDomainSubscription(subscription),
      repository: toDomainRepository(subscription.repository),
    }));
  }
}
