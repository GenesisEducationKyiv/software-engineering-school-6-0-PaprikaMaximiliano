import type { SubscribeInput } from "../../contracts/subscriptionContracts";
import type { ISubscriptionRepository } from "../../domain/ports/ISubscriptionRepository";
import type { ISagaNotificationParticipant } from "../../../../platform/messaging/ports/ISagaNotificationParticipant";
import type { SagaStep } from "../../../../platform/saga/types";

export const SUBSCRIBE_CONFIRMATION_SAGA_TYPE = "SUBSCRIBE_CONFIRMATION";

export const SUBSCRIBE_SAGA_STEPS = {
  CREATE_SUBSCRIPTION: "CreateSubscription",
  SEND_CONFIRMATION: "SendConfirmation",
} as const;

export type SubscribeSagaContext = {
  input: SubscribeInput;
  latestTag: string | null;
  confirmationToken: string;
  unsubscribeToken: string;
  confirmUrl: string;
  unsubscribeUrl: string;
  subscriptionId?: string;
};

export function createSubscribeConfirmationSteps(
  subscriptionRepository: ISubscriptionRepository,
  sagaNotificationParticipant: ISagaNotificationParticipant,
): SagaStep<SubscribeSagaContext>[] {
  return [
    {
      name: SUBSCRIBE_SAGA_STEPS.CREATE_SUBSCRIPTION,
      async execute(context) {
        const [owner, name] = context.input.repo.split("/");
        const createdSubscription = await subscriptionRepository.create({
          email: context.input.email,
          repo: context.input.repo,
          owner,
          name,
          latestTag: context.latestTag,
          confirmationToken: context.confirmationToken,
          unsubscribeToken: context.unsubscribeToken,
        });

        context.subscriptionId = createdSubscription.id;
      },
      async compensate(context) {
        if (context.subscriptionId) {
          await subscriptionRepository.deleteById(context.subscriptionId);
        }
      },
    },
    {
      name: SUBSCRIBE_SAGA_STEPS.SEND_CONFIRMATION,
      async execute(context, sagaId) {
        await sagaNotificationParticipant.sendConfirmation(
          {
            to: context.input.email,
            repo: context.input.repo,
            confirmUrl: context.confirmUrl,
            unsubscribeUrl: context.unsubscribeUrl,
          },
          sagaId,
        );
      },
      async compensate() {
        // No compensation needed when notification fails.
      },
    },
  ];
}
