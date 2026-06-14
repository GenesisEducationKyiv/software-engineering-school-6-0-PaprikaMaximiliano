import { describe, it, expect } from "vitest";
import { SubscriptionMapper } from "@/modules/subscription/domain/SubscriptionMapper";
import { Repository, SubscriptionWithRepository } from "@/modules/subscription/domain/models";

describe("SubscriptionMapper", () => {
  const mockData = {
    id: "sub-123",
    email: "user@test.com",
    confirmed: true,
    repository: {
      fullName: "facebook/react",
      lastSeenTag: "v18.0.0",
    } as Repository,
  } as unknown as SubscriptionWithRepository;

  describe("toResponse", () => {
    it("should correctly map database models to a public response object", () => {
      const result = SubscriptionMapper.toResponse(mockData);

      expect(result).toEqual({
        email: "user@test.com",
        repo: "facebook/react",
        confirmed: true,
        last_seen_tag: "v18.0.0",
      });
    });
  });

  describe("toResponseList", () => {
    it("should map an array of subscriptions", () => {
      const result = SubscriptionMapper.toResponseList([mockData, mockData]);

      expect(result).toHaveLength(2);
      expect(result[0].repo).toBe("facebook/react");
      expect(result[1].repo).toBe("facebook/react");
    });
  });
});
