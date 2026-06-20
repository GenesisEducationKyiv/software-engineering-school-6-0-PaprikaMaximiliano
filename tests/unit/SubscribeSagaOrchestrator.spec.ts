import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscribeSagaOrchestrator } from "@/modules/subscription/application/sagas/SubscribeSagaOrchestrator";
import { SUBSCRIBE_CONFIRMATION_SAGA_TYPE } from "@/modules/subscription/application/sagas/SubscribeConfirmationSaga";
import type { SubscribeSagaContext } from "@/modules/subscription/application/sagas/SubscribeConfirmationSaga";
import { SubscriptionAlreadyExistsError } from "@/modules/subscription/domain/errors/SubscriptionAlreadyExistsError";
import { SagaOrchestrator } from "@/platform/saga/SagaOrchestrator";
import type { SagaRunOptions } from "@/platform/saga/types";
import type { ISagaNotificationParticipant } from "@/platform/messaging/ports/ISagaNotificationParticipant";
import type { ISubscriptionRepository } from "@/modules/subscription/domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "@/modules/subscription/domain/ports/ITokenGenerator";
import { SubscriptionUrlBuilder } from "@/modules/subscription/domain/UrlBuilder";
import { SubscriptionConflictError, SagaExecutionError } from "@/platform/errors";

describe("SubscribeSagaOrchestrator", () => {
  const mockSubscriptionRepository = {
    create: vi.fn(),
    deleteById: vi.fn(),
  } as unknown as ISubscriptionRepository;

  const mockSagaNotificationParticipant = {
    sendConfirmation: vi.fn(),
  } as unknown as ISagaNotificationParticipant;

  const mockTokenGenerator = {
    generate: vi.fn(),
  } as unknown as ITokenGenerator;

  const urlBuilder = new SubscriptionUrlBuilder("https://app.test.com");
  let sagaOrchestratorRun: ReturnType<typeof vi.fn>;
  let orchestrator: SubscribeSagaOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    sagaOrchestratorRun = vi.fn().mockResolvedValue(undefined);
    orchestrator = new SubscribeSagaOrchestrator(
      { run: sagaOrchestratorRun } as unknown as SagaOrchestrator,
      mockSagaNotificationParticipant,
      mockTokenGenerator,
      urlBuilder,
      mockSubscriptionRepository,
    );
  });

  it("runs subscribe confirmation saga with generated tokens and urls", async () => {
    vi.mocked(mockTokenGenerator.generate)
      .mockReturnValueOnce("confirm-token")
      .mockReturnValueOnce("unsub-token");

    await orchestrator.execute({ email: "user@example.com", repo: "owner/repo" }, "v1.0.0");

    expect(sagaOrchestratorRun).toHaveBeenCalledOnce();
    const runArgs = vi.mocked(sagaOrchestratorRun).mock
      .calls[0]?.[0] as SagaRunOptions<SubscribeSagaContext>;
    expect(runArgs).toBeDefined();

    expect(runArgs.type).toBe(SUBSCRIBE_CONFIRMATION_SAGA_TYPE);
    expect(runArgs.payload).toEqual({ email: "user@example.com", repo: "owner/repo" });
    expect(runArgs.context).toMatchObject({
      input: { email: "user@example.com", repo: "owner/repo" },
      latestTag: "v1.0.0",
      confirmationToken: "confirm-token",
      unsubscribeToken: "unsub-token",
      confirmUrl: "https://app.test.com/api/confirm/confirm-token",
      unsubscribeUrl: "https://app.test.com/api/unsubscribe/unsub-token",
    });
    expect(runArgs.steps).toHaveLength(2);
  });

  it("maps SubscriptionAlreadyExistsError to SubscriptionConflictError", async () => {
    sagaOrchestratorRun.mockRejectedValue(new SubscriptionAlreadyExistsError());

    await expect(
      orchestrator.execute({ email: "user@example.com", repo: "owner/repo" }, "v1.0.0"),
    ).rejects.toThrow(SubscriptionConflictError);
  });

  it("maps other saga failures to SagaExecutionError", async () => {
    sagaOrchestratorRun.mockRejectedValue(new Error("notification failed"));

    await expect(
      orchestrator.execute({ email: "user@example.com", repo: "owner/repo" }, "v1.0.0"),
    ).rejects.toThrow(SagaExecutionError);
  });
});
