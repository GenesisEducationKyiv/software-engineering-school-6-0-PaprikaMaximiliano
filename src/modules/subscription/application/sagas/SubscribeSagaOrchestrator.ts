import { SubscriptionAlreadyExistsError } from "../../domain/errors/SubscriptionAlreadyExistsError";
import type { ISubscriptionRepository } from "../../domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "../../domain/ports/ITokenGenerator";
import { SubscriptionUrlBuilder } from "../../domain/UrlBuilder";
import { SubscriptionConflictError, SagaExecutionError } from "../../../../platform/errors";
import type { ISagaNotificationParticipant } from "../../../../platform/messaging/ports/ISagaNotificationParticipant";
import { SagaOrchestrator } from "../../../../platform/saga/SagaOrchestrator";
import type { SubscribeInput } from "../../api/types";
import {
  createSubscribeConfirmationSteps,
  SUBSCRIBE_CONFIRMATION_SAGA_TYPE,
  type SubscribeSagaContext,
} from "./SubscribeConfirmationSaga";

export class SubscribeSagaOrchestrator {
  constructor(
    private readonly sagaOrchestrator: SagaOrchestrator,
    private readonly sagaNotificationParticipant: ISagaNotificationParticipant,
    private readonly tokenGenerator: ITokenGenerator,
    private readonly urlBuilder: SubscriptionUrlBuilder,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {}

  async execute(input: SubscribeInput, latestTag: string | null): Promise<void> {
    const confirmationToken = this.tokenGenerator.generate();
    const unsubscribeToken = this.tokenGenerator.generate();

    const context: SubscribeSagaContext = {
      input,
      latestTag,
      confirmationToken,
      unsubscribeToken,
      confirmUrl: this.urlBuilder.buildConfirmUrl(confirmationToken),
      unsubscribeUrl: this.urlBuilder.buildUnsubscribeUrl(unsubscribeToken),
    };

    const steps = createSubscribeConfirmationSteps(
      this.subscriptionRepository,
      this.sagaNotificationParticipant,
    );

    try {
      await this.sagaOrchestrator.run({
        type: SUBSCRIBE_CONFIRMATION_SAGA_TYPE,
        payload: { email: input.email, repo: input.repo },
        context,
        steps,
      });
    } catch (error) {
      if (error instanceof SubscriptionAlreadyExistsError) {
        throw new SubscriptionConflictError("Email already subscribed to this repository");
      }

      if (error instanceof SubscriptionConflictError) {
        throw error;
      }

      throw new SagaExecutionError("Failed to complete subscription. Please try again later.");
    }
  }
}
