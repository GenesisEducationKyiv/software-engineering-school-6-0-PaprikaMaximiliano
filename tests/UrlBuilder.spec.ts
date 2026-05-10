import { describe, it, expect } from "vitest";
import { SubscriptionUrlBuilder } from "../src/subscription/UrlBuilder";

describe("UrlBuilder", () => {
  const baseUrl = "https://app.example.com";
  const builder = new SubscriptionUrlBuilder(baseUrl);
  const testToken = "test-token-123";

  describe("buildConfirmUrl", () => {
    it("should construct the correct confirmation URL", () => {
      const result = builder.buildConfirmUrl(testToken);

      expect(result).toBe("https://app.example.com/api/confirm/test-token-123");
    });
  });

  describe("buildUnsubscribeUrl", () => {
    it("should construct the correct unsubscribe URL", () => {
      const result = builder.buildUnsubscribeUrl(testToken);

      expect(result).toBe("https://app.example.com/api/unsubscribe/test-token-123");
    });
  });
});
