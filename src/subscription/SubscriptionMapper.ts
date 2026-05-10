import { SubscriptionResponse } from "../types";
import { Repository, Subscription } from "../models";

export class SubscriptionMapper {
  static toResponse(
    this: void,
    subscription: Subscription & { repository: Repository },
  ): SubscriptionResponse {
    return {
      email: subscription.email,
      repo: subscription.repository.fullName,
      confirmed: subscription.confirmed,
      last_seen_tag: subscription.repository.lastSeenTag,
    };
  }

  static toResponseList(
    subscriptions: Array<Subscription & { repository: Repository }>,
  ): SubscriptionResponse[] {
    return subscriptions.map(this.toResponse);
  }
}
