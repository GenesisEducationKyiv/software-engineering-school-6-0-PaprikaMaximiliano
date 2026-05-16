import { Subscription } from "./Subscription";

export interface Repository {
  owner: string;
  name: string;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  fullName: string;
  lastSeenTag: string | null;
}

export interface RepositoryWithSubscriptions extends Repository {
  subscriptions: Subscription[];
}
