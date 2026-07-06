import type { SubscriptionResponse } from "../contracts/subscriptionContracts";
import type { SubscriptionWithRepository } from "./models";

export class SubscriptionMapper {
  static toResponse(this: void, subscription: SubscriptionWithRepository): SubscriptionResponse {
    return {
      email: subscription.email,
      repo: subscription.repository.fullName,
      confirmed: subscription.confirmed,
      last_seen_tag: subscription.repository.lastSeenTag,
    };
  }

  static toResponseList(subscriptions: SubscriptionWithRepository[]): SubscriptionResponse[] {
    return subscriptions.map(this.toResponse);
  }
}
