export class SubscriptionAlreadyExistsError extends Error {
  constructor(message = "Subscription already exists") {
    super(message);
    this.name = "SubscriptionAlreadyExistsError";
  }
}
