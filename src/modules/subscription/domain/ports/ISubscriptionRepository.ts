import type { Subscription, SubscriptionWithRepository } from "../models";

export interface CreateSubscriptionDTO {
  email: string;
  repo: string;
  owner: string;
  name: string;
  latestTag: string | null;
  confirmationToken: string;
  unsubscribeToken: string;
}

export interface ISubscriptionRepository {
  create(createSubscriptionDto: CreateSubscriptionDTO): Promise<Subscription>;
  getByConfirmationToken(token: string): Promise<Subscription | null>;
  confirmById(id: string): Promise<Subscription>;
  deleteByUnsubscribeToken(token: string): Promise<void>;
  getAllByEmail(email: string): Promise<SubscriptionWithRepository[]>;
}
