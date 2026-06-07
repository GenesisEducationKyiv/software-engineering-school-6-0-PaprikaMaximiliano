export type ScanSubscriber = {
  email: string;
  unsubscribeUrl: string;
};

export type ScanTarget = {
  id: string;
  fullName: string;
  lastSeenTag: string | null;
  subscribers: ScanSubscriber[];
};

export type UpdateLastSeenTagInput = {
  repositoryId: string;
  previousLastSeenTag: string | null;
  newLastSeenTag: string;
};
