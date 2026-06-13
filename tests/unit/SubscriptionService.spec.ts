import { describe, it, expect, vi, beforeEach } from "vitest";
import { SubscriptionService } from "@/modules/subscription/application/SubscriptionService";
import { ISubscriptionRepository } from "@/modules/subscription/domain/ports/ISubscriptionRepository";
import { IMailer } from "@/platform/integrations/ports/IMailer";
import { ITokenGenerator } from "@/modules/subscription/domain/ports/ITokenGenerator";
import { SubscriptionUrlBuilder } from "@/modules/subscription/domain/UrlBuilder";
import { RepoValidator } from "@/modules/subscription/domain/RepoValidator";
import { SubscriptionAlreadyExistsError } from "@/modules/subscription/domain/errors/SubscriptionAlreadyExistsError";
import { SubscriptionConflictError, ResourceNotFoundError } from "@/platform/errors";
import { Subscription, SubscriptionWithRepository } from "@/modules/subscription/domain/models";

describe("SubscriptionService", () => {
  const mockRepo = {
    create: vi.fn(),
    getByConfirmationToken: vi.fn(),
    confirmById: vi.fn(),
    deleteByUnsubscribeToken: vi.fn(),
    getAllByEmail: vi.fn(),
  } as unknown as ISubscriptionRepository;

  const mockMailer = {
    sendConfirmationEmail: vi.fn(),
  } as unknown as IMailer;

  const mockTokenGen = {
    generate: vi.fn(),
  } as unknown as ITokenGenerator;

  const mockUrlBuilder = {
    buildConfirmUrl: vi.fn(),
    buildUnsubscribeUrl: vi.fn(),
  } as unknown as SubscriptionUrlBuilder;

  const mockValidator = {
    validateAndGetLatestTag: vi.fn(),
  } as unknown as RepoValidator;

  let service: SubscriptionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SubscriptionService(
      mockRepo,
      mockMailer,
      mockTokenGen,
      mockUrlBuilder,
      mockValidator,
    );
  });

  describe("subscribe", () => {
    const input = { email: "test@example.com", repo: "owner/repo" };

    it("should create a subscription and send an email", async () => {
      vi.mocked(mockValidator.validateAndGetLatestTag).mockResolvedValue("v1.0.0");
      vi.mocked(mockTokenGen.generate)
        .mockReturnValueOnce("token-confirm")
        .mockReturnValueOnce("token-unsub");

      const createdSub = {
        email: input.email,
        confirmationToken: "token-confirm",
        unsubscribeToken: "token-unsub",
      } as Subscription;

      vi.mocked(mockRepo.create).mockResolvedValue(createdSub);
      vi.mocked(mockUrlBuilder.buildConfirmUrl).mockReturnValue("http://confirm");
      vi.mocked(mockUrlBuilder.buildUnsubscribeUrl).mockReturnValue("http://unsub");

      await service.subscribe(input);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: "owner",
          name: "repo",
          latestTag: "v1.0.0",
          confirmationToken: "token-confirm",
        }),
      );

      expect(mockMailer.sendConfirmationEmail).toHaveBeenCalledWith({
        to: input.email,
        repo: input.repo,
        confirmUrl: "http://confirm",
        unsubscribeUrl: "http://unsub",
      });
    });

    it("should throw SubscriptionConflictError if repository throws already exists", async () => {
      vi.mocked(mockValidator.validateAndGetLatestTag).mockResolvedValue("v1.0.0");
      vi.mocked(mockRepo.create).mockRejectedValue(new SubscriptionAlreadyExistsError());

      await expect(service.subscribe(input)).rejects.toThrow(SubscriptionConflictError);
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
