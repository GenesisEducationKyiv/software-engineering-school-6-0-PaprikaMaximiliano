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

export interface Repository {
  owner: string;
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  lastSeenTag: string | null;
}

export interface SubscriptionWithRepository extends Subscription {
  repository: Repository;
}

export interface RepositoryWithSubscriptions extends Repository {
  subscriptions: Subscription[];
}
