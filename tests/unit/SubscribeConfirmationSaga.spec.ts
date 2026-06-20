import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSubscribeConfirmationSteps,
  SUBSCRIBE_SAGA_STEPS,
  type SubscribeSagaContext,
} from "@/modules/subscription/application/sagas/SubscribeConfirmationSaga";
import type { ISubscriptionRepository } from "@/modules/subscription/domain/ports/ISubscriptionRepository";
import type { ISagaNotificationParticipant } from "@/platform/messaging/ports/ISagaNotificationParticipant";

describe("SubscribeConfirmationSaga", () => {
  const mockSubscriptionRepository = {
    create: vi.fn(),
    deleteById: vi.fn(),
  } as unknown as ISubscriptionRepository;

  const mockSagaNotificationParticipant = {
    sendConfirmation: vi.fn(),
  } as unknown as ISagaNotificationParticipant;

  let steps: ReturnType<typeof createSubscribeConfirmationSteps>;
  let context: SubscribeSagaContext;

  beforeEach(() => {
    vi.clearAllMocks();
    steps = createSubscribeConfirmationSteps(
      mockSubscriptionRepository,
      mockSagaNotificationParticipant,
    );
    context = {
      input: { email: "user@example.com", repo: "owner/repo" },
      latestTag: "v1.0.0",
      confirmationToken: "confirm-token",
      unsubscribeToken: "unsub-token",
      confirmUrl: "https://app.test.com/api/confirm/confirm-token",
      unsubscribeUrl: "https://app.test.com/api/unsubscribe/unsub-token",
    };
  });

  it("creates subscription and stores subscription id in context", async () => {
    vi.mocked(mockSubscriptionRepository.create).mockResolvedValue({
      id: "sub-123",
    } as Awaited<ReturnType<ISubscriptionRepository["create"]>>);

    await steps[0].execute(context, "saga-1");

    expect(mockSubscriptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "user@example.com",
        repo: "owner/repo",
        owner: "owner",
        name: "repo",
      }),
    );
    expect(context.subscriptionId).toBe("sub-123");
  });

  it("deletes subscription on compensation when subscription id exists", async () => {
    context.subscriptionId = "sub-123";

    await steps[0].compensate(context, "saga-1");

    expect(mockSubscriptionRepository.deleteById).toHaveBeenCalledWith("sub-123");
  });

  it("sends confirmation through saga notification participant", async () => {
    await steps[1].execute(context, "saga-1");

    expect(mockSagaNotificationParticipant.sendConfirmation).toHaveBeenCalledWith(
      {
        to: "user@example.com",
        repo: "owner/repo",
        confirmUrl: context.confirmUrl,
        unsubscribeUrl: context.unsubscribeUrl,
      },
      "saga-1",
    );
  });

  it("defines expected step names", () => {
    expect(steps.map((step) => step.name)).toEqual([
      SUBSCRIBE_SAGA_STEPS.CREATE_SUBSCRIPTION,
      SUBSCRIBE_SAGA_STEPS.SEND_CONFIRMATION,
    ]);
  });
});
