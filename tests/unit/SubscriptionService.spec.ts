import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionService } from "@/modules/subscription/application/SubscriptionService";
import { ISubscriptionRepository } from "@/modules/subscription/domain/ports/ISubscriptionRepository";
import { SubscribeSagaOrchestrator } from "@/modules/subscription/application/sagas/SubscribeSagaOrchestrator";
import { RepoValidator } from "@/modules/subscription/domain/RepoValidator";
import { ResourceNotFoundError } from "@/platform/errors";
import { Subscription, SubscriptionWithRepository } from "@/modules/subscription/domain/models";

describe("SubscriptionService", () => {
  const mockRepo = {
    create: vi.fn(),
    getByConfirmationToken: vi.fn(),
    confirmById: vi.fn(),
    deleteByUnsubscribeToken: vi.fn(),
    deleteById: vi.fn(),
    getAllByEmail: vi.fn(),
  } as unknown as ISubscriptionRepository;

  const mockSubscribeSagaOrchestrator = {
    execute: vi.fn(),
  } as unknown as SubscribeSagaOrchestrator;

  const mockValidator = {
    validateAndGetLatestTag: vi.fn(),
  } as unknown as RepoValidator;

  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionService(mockRepo, mockSubscribeSagaOrchestrator, mockValidator);
  });

  describe("subscribe", () => {
    const input = { email: "test@example.com", repo: "owner/repo" };

    it("validates repo and delegates to subscribe saga orchestrator", async () => {
      vi.mocked(mockValidator.validateAndGetLatestTag).mockResolvedValue("v1.0.0");

      await service.subscribe(input);

      expect(mockValidator.validateAndGetLatestTag).toHaveBeenCalledWith("owner/repo");
      expect(mockSubscribeSagaOrchestrator.execute).toHaveBeenCalledWith(input, "v1.0.0");
    });
  });

  describe("confirm", () => {
    it("should confirm the subscription if it exists and is not confirmed", async () => {
      const existing = { id: "123", confirmed: false } as Subscription;
      vi.mocked(mockRepo.getByConfirmationToken).mockResolvedValue(existing);

      await service.confirm("valid-token");

      expect(mockRepo.confirmById).toHaveBeenCalledWith("123");
    });

    it("should not call repository confirm if already confirmed", async () => {
      const existing = { id: "123", confirmed: true } as Subscription;
      vi.mocked(mockRepo.getByConfirmationToken).mockResolvedValue(existing);

      await service.confirm("valid-token");

      expect(mockRepo.confirmById).not.toHaveBeenCalled();
    });

    it("should throw ResourceNotFoundError if token is invalid", async () => {
      vi.mocked(mockRepo.getByConfirmationToken).mockResolvedValue(null);

      await expect(service.confirm("bad-token")).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe("unsubscribe", () => {
    it("should throw ResourceNotFoundError if deletion fails", async () => {
      vi.mocked(mockRepo.deleteByUnsubscribeToken).mockRejectedValue(
        new ResourceNotFoundError("Token not found"),
      );

      await expect(service.unsubscribe("token")).rejects.toThrow(ResourceNotFoundError);
    });
  });

  describe("listByEmail", () => {
    it("should return a mapped list of subscriptions with their repositories", async () => {
      const mockDbResult = [
        {
          id: "sub-1",
          email: "test@example.com",
          repo: "owner/repo1",
          confirmed: true,
          repository: {
            id: "repo-1",
            fullName: "owner/repo1",
            lastSeenTag: "v1.0.0",
          },
        } as unknown as SubscriptionWithRepository,
      ];

      vi.mocked(mockRepo.getAllByEmail).mockResolvedValue(mockDbResult);

      const result = await service.listByEmail("test@example.com");

      expect(mockRepo.getAllByEmail).toHaveBeenCalledWith("test@example.com");
      expect(result).toHaveLength(1);

      expect(result[0]).toMatchObject({
        repo: "owner/repo1",
      });
    });
  });
});
