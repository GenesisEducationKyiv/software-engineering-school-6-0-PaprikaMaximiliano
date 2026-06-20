import type { SubscribeInput, SubscriptionResponse } from "../api/types";
import { ResourceNotFoundError } from "../../../platform/errors";
import { RepoValidator } from "../domain/RepoValidator";
import { SubscriptionMapper } from "../domain/SubscriptionMapper";
import type { ISubscriptionRepository } from "../domain/ports/ISubscriptionRepository";
import type { SubscribeSagaOrchestrator } from "./sagas/SubscribeSagaOrchestrator";

export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: ISubscriptionRepository,
    private readonly subscribeSagaOrchestrator: SubscribeSagaOrchestrator,
    private readonly repoValidator: RepoValidator,
  ) {}

  async subscribe(input: SubscribeInput): Promise<void> {
    const latestTag = await this.repoValidator.validateAndGetLatestTag(input.repo);
    await this.subscribeSagaOrchestrator.execute(input, latestTag);
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
