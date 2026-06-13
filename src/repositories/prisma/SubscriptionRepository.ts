import { Prisma, Subscription } from "@prisma/client";

import { ResourceNotFoundError } from "../../errors";
import { isPrismaNotFoundError } from "../../errors/prismaErrors";
import { prisma } from "../../lib/prisma";
import { CreateSubscriptionDTO, ISubscriptionRepository } from "../ISubscriptionRepository";
import { SubscriptionWithRepository } from "../../models";

export class SubscriptionAlreadyExistsError extends Error {}

export class SubscriptionRepository implements ISubscriptionRepository {
  async create(createSubscriptionDto: CreateSubscriptionDTO): Promise<Subscription> {
    try {
      const { email, repo, owner, name, latestTag, confirmationToken, unsubscribeToken } =
        createSubscriptionDto;
      return await prisma.subscription.create({
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
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          throw new SubscriptionAlreadyExistsError("Subscription already exists");
        }
      }

      throw error;
    }
  }

  async getByConfirmationToken(token: string): Promise<Subscription | null> {
    return await prisma.subscription.findUnique({
      where: { confirmationToken: token },
    });
  }

  async confirmById(id: string): Promise<Subscription> {
    try {
      return await prisma.subscription.update({
        where: { id },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
        },
      });
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

  async getAllByEmail(email: string): Promise<SubscriptionWithRepository[]> {
    return await prisma.subscription.findMany({
      where: { email },
      include: { repository: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
