export type SubscriptionResponse = {
  email: string;
  repo: string;
  confirmed: boolean;
  last_seen_tag: string | null;
};

export type SubscribeInput = {
  email: string;
  repo: string;
};
