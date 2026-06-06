import type { ScanTarget, UpdateLastSeenTagInput } from "../contracts/scannerContracts";
import { SubscriptionUrlBuilder } from "../domain/UrlBuilder";
import type { IRepositoryRepository } from "../domain/ports/IRepositoryRepository";

export class ScannerAccessService {
  constructor(
    private readonly repositoryRepository: IRepositoryRepository,
    private readonly urlBuilder: SubscriptionUrlBuilder,
  ) {}

  async listScanTargets(): Promise<ScanTarget[]> {
    const repositories = await this.repositoryRepository.getAllWithConfirmedSubscriptions();

    return repositories.map((repository) => ({
      id: repository.id,
      fullName: repository.fullName,
      lastSeenTag: repository.lastSeenTag,
      subscribers: repository.subscriptions.map((subscription) => ({
        email: subscription.email,
        unsubscribeUrl: this.urlBuilder.buildUnsubscribeUrl(subscription.unsubscribeToken),
      })),
    }));
  }

  async updateLastSeenTag(input: UpdateLastSeenTagInput): Promise<void> {
    await this.repositoryRepository.updateByIdAndLastSeenTag(
      input.repositoryId,
      input.previousLastSeenTag,
      input.newLastSeenTag,
    );
  }
}
