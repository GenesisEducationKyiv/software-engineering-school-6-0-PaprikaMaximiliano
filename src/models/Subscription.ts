import { Repository } from "./Repository";

export interface Subscription {
  id: string;
  email: string;
  confirmed: boolean;
  confirmationToken: string;
  unsubscribeToken: string;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  repositoryId: string;
}

export interface SubscriptionWithRepository extends Subscription {
  repository: Repository;
}
