import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import type { SubscribeInput, SubscriptionResponse } from "../types.js";
import { isValidEmail, isValidRepoFormat } from "../utils/validation.js";
import {
  GitHubClient,
  GitHubNotFoundError,
} from "../integrations/githubClient.js";
import { Mailer } from "../integrations/mailer.js";

export class SubscriptionConflictError extends Error {}
export class ValidationError extends Error {}
export class ResourceNotFoundError extends Error {}

export class SubscriptionService {
  constructor(
    private readonly githubClient: GitHubClient,
    private readonly mailer: Mailer,
    private readonly appBaseUrl: string,
  ) {}

  async subscribe(input: SubscribeInput): Promise<void> {
    if (!isValidEmail(input.email) || !isValidRepoFormat(input.repo)) {
      throw new ValidationError("Invalid input");
    }

    const latestTag = await this.githubClient
      .getLatestReleaseTag(input.repo)
      .catch((error) => {
        if (error instanceof GitHubNotFoundError) {
          throw new ResourceNotFoundError("Repository not found");
        }
        throw error;
      });

    const [owner, name] = input.repo.split("/");
    const confirmationToken = randomUUID();
    const unsubscribeToken = randomUUID();

    try {
      const created = await prisma.subscription.create({
        data: {
          email: input.email,
          confirmationToken,
          unsubscribeToken,
          repository: {
            connectOrCreate: {
              where: { fullName: input.repo },
              create: {
                fullName: input.repo,
                owner,
                name,
                lastSeenTag: latestTag,
              },
            },
          },
        },
      });

      await this.mailer.sendConfirmationEmail({
        to: created.email,
        repo: input.repo,
        confirmUrl: `${this.appBaseUrl}/api/confirm/${created.confirmationToken}`,
        unsubscribeUrl: `${this.appBaseUrl}/api/unsubscribe/${created.unsubscribeToken}`,
      });
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === "P2002") {
        throw new SubscriptionConflictError("Already subscribed");
      }
      throw error;
    }
  }

  async confirm(token: string): Promise<void> {
    const existing = await prisma.subscription.findUnique({
      where: { confirmationToken: token },
    });

    if (!existing) {
      throw new ResourceNotFoundError("Token not found");
    }

    if (!existing.confirmed) {
      await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          confirmed: true,
          confirmedAt: new Date(),
        },
      });
    }
  }

  async unsubscribe(token: string): Promise<void> {
    const deleted = await prisma.subscription.deleteMany({
      where: { unsubscribeToken: token },
    });

    if (deleted.count === 0) {
      throw new ResourceNotFoundError("Token not found");
    }
  }

  async listByEmail(email: string): Promise<SubscriptionResponse[]> {
    if (!isValidEmail(email)) {
      throw new ValidationError("Invalid email");
    }

    const subscriptions = await prisma.subscription.findMany({
      where: { email },
      include: { repository: true },
      orderBy: { createdAt: "desc" },
    });

    return subscriptions.map(
      (sub: {
        email: string;
        confirmed: boolean;
        repository: { fullName: string; lastSeenTag: string | null };
      }) => ({
        email: sub.email,
        repo: sub.repository.fullName,
        confirmed: sub.confirmed,
        last_seen_tag: sub.repository.lastSeenTag,
      }),
    );
  }
}
