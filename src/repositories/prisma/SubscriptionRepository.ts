import { Prisma, Subscription } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { CreateSubscriptionDTO, ISubscriptionRepository } from "../ISubscriptionRepository";
import { Repository } from "../../models";

export class SubscriptionAlreadyExistsError extends Error {}

export class SubscriptionRepository implements ISubscriptionRepository {
  async create(createSubscriptionDto: CreateSubscriptionDTO): Promise<Subscription> {
    try {
      const { email, repo, owner, name, latestTag, confirmationToken, unsubscribeToken } =
        createSubscriptionDto;
      return await prisma.subscription.create({
        data: {
          email: email,
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
    return await prisma.subscription.update({
      where: { id },
      data: {
        confirmed: true,
        confirmedAt: new Date(),
      },
    });
  }

  async deleteByUnsubscribeToken(token: string): Promise<boolean> {
    const deleted = await prisma.subscription.deleteMany({
      where: { unsubscribeToken: token },
    });
    return deleted.count > 0;
  }

  async getAllByEmail(email: string): Promise<Array<Subscription & { repository: Repository }>> {
    return await prisma.subscription.findMany({
      where: { email },
      include: { repository: true },
      orderBy: { createdAt: "desc" },
    });
  }
}
