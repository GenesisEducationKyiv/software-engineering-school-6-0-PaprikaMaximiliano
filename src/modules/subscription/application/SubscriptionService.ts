import type { SubscribeInput, SubscriptionResponse } from "../api/types";
import type { IMailer } from "../../../platform/integrations/ports/IMailer";
import { ResourceNotFoundError, SubscriptionConflictError } from "../../../platform/errors";
import { SubscriptionAlreadyExistsError } from "../domain/errors/SubscriptionAlreadyExistsError";
import { RepoValidator } from "../domain/RepoValidator";
import { SubscriptionMapper } from "../domain/SubscriptionMapper";
import type { ISubscriptionRepository } from "../domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "../domain/ports/ITokenGenerator";
import { SubscriptionUrlBuilder } from "../domain/UrlBuilder";

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly mailer: IMailer,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly urlBuilder: SubscriptionUrlBuilder,
    private readonly repoValidator: RepoValidator,
  ) {}

  async subscribe(input: SubscribeInput): Promise<void> {
    const latestTag = await this.repoValidator.validateAndGetLatestTag(input.repo);

    const [owner, name] = input.repo.split("/");
    const confirmationToken = this.tokenGenerator.generate();
    const unsubscribeToken = this.tokenGenerator.generate();

    try {
      const createdSubscription = await this.subscriptionRepository.create({
        email: input.email,
        repo: input.repo,
        owner,
        name,
        latestTag,
        confirmationToken,
        unsubscribeToken,
      });

      await this.mailer.sendConfirmationEmail({
        to: createdSubscription.email,
        repo: input.repo,
        confirmUrl: this.urlBuilder.buildConfirmUrl(createdSubscription.confirmationToken),
        unsubscribeUrl: this.urlBuilder.buildUnsubscribeUrl(createdSubscription.unsubscribeToken),
      });
    } catch (error) {
      if (error instanceof SubscriptionAlreadyExistsError) {
        throw new SubscriptionConflictError("Email already subscribed to this repository");
      }
      throw error;
    }
  }

  async confirm(token: string): Promise<void> {
    const existing = await this.subscriptionRepository.getByConfirmationToken(token);

    if (!existing) {
      throw new ResourceNotFoundError("Token not found");
    }

    if (!existing.confirmed) {
      await this.subscriptionRepository.confirmById(existing.id);
    }
  }

  async unsubscribe(token: string): Promise<void> {
    await this.subscriptionRepository.deleteByUnsubscribeToken(token);
  }

  async listByEmail(email: string): Promise<SubscriptionResponse[]> {
    const subscriptions = await this.subscriptionRepository.getAllByEmail(email);
    return SubscriptionMapper.toResponseList(subscriptions);
  }
}
