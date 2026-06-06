import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import {
  API_KEY,
  APP_BASE_URL,
  CONFIRM_TOKEN,
  TEST_EMAIL,
  TEST_REPO,
  TEST_TAG,
  UNKNOWN_TOKEN,
  UNSUBSCRIBE_TOKEN,
} from "./constants";
import { apiRequest, metricsRequest, parseJsonBody, subscribe } from "./helpers/apiClient";
import { createIntegrationTestContext } from "./setup/testApp";

const ctx = createIntegrationTestContext();

describe("API integration", () => {
  beforeAll(async () => {
    await ctx.ready();
  });

  beforeEach(async () => {
    await ctx.reset();
  });

  afterAll(async () => {
    await ctx.close();
  });

  describe("auth", () => {
    it("rejects requests without API key", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
        includeApiKey: false,
      });

      expect(response.statusCode).toBe(401);
    });

    it("rejects requests with invalid API key", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
        headers: { "x-api-key": "wrong-key" },
        includeApiKey: false,
      });

      expect(response.statusCode).toBe(401);
    });

    it("accepts requests with Authorization Bearer token", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
        headers: { authorization: `Bearer ${API_KEY}` },
        includeApiKey: false,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual([]);
    });
  });

  describe("subscribe", () => {
    it("creates a subscription and sends confirmation email", async () => {
      const response = await subscribe(ctx);

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual({
        message: "Subscription successful. Confirmation email sent.",
      });

      expect(ctx.mailer.confirmationEmails).toHaveLength(1);
      expect(ctx.mailer.confirmationEmails[0]).toMatchObject({
        to: TEST_EMAIL,
        repo: TEST_REPO,
        confirmUrl: `${APP_BASE_URL}/api/confirm/${CONFIRM_TOKEN}`,
        unsubscribeUrl: `${APP_BASE_URL}/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });
    });

    it("rejects duplicate subscription for same email and repo", async () => {
      await subscribe(ctx);

      const response = await subscribe(ctx);

      expect(response.statusCode).toBe(409);
      expect(parseJsonBody(response)).toEqual({
        message: "Email already subscribed to this repository",
      });
    });

    it("returns 404 when repository not found on GitHub", async () => {
      ctx.sourceControlClient.mode = "not-found";

      const response = await subscribe(ctx);

      expect(response.statusCode).toBe(404);
      expect(parseJsonBody(response)).toEqual({
        message: "Repository not found on GitHub",
      });
    });

    it("returns 503 when GitHub rate limit is hit", async () => {
      ctx.sourceControlClient.mode = "rate-limit";

      const response = await subscribe(ctx);

      expect(response.statusCode).toBe(503);
      expect(parseJsonBody(response)).toEqual({
        message: "GitHub API rate limit reached. Please retry later.",
      });
    });

    it("returns 400 for invalid subscribe body", async () => {
      const response = await apiRequest(ctx, {
        method: "POST",
        url: "/api/subscribe",
        body: { email: "not-an-email", repo: TEST_REPO },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("list subscriptions", () => {
    it("returns empty list for unknown email", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent("unknown@example.com")}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual([]);
    });

    it("lists unconfirmed subscriptions for email", async () => {
      await subscribe(ctx);

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual([
        {
          email: TEST_EMAIL,
          repo: TEST_REPO,
          confirmed: false,
          last_seen_tag: TEST_TAG,
        },
      ]);
    });

    it("shows confirmed status after confirmation", async () => {
      await subscribe(ctx);

      await apiRequest(ctx, {
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual([
        {
          email: TEST_EMAIL,
          repo: TEST_REPO,
          confirmed: true,
          last_seen_tag: TEST_TAG,
        },
      ]);
    });
  });

  describe("confirm", () => {
    it("confirms pending subscription", async () => {
      await subscribe(ctx);

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual({
        message: "Subscription confirmed successfully",
      });
    });

    it("returns 200 when confirming an already confirmed subscription", async () => {
      await subscribe(ctx);

      await apiRequest(ctx, {
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual({
        message: "Subscription confirmed successfully",
      });
    });

    it("returns 404 for invalid token", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/confirm/${UNKNOWN_TOKEN}`,
      });

      expect(response.statusCode).toBe(404);
      expect(parseJsonBody(response)).toEqual({
        message: "Token not found",
      });
    });

    it("returns 400 for malformed token param", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: "/api/confirm/not-a-token",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("unsubscribe", () => {
    it("removes subscription", async () => {
      await subscribe(ctx);

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual({
        message: "Unsubscribed successfully",
      });
    });

    it("returns empty list after unsubscribe", async () => {
      await subscribe(ctx);

      await apiRequest(ctx, {
        method: "GET",
        url: `/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });

      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(response.statusCode).toBe(200);
      expect(parseJsonBody(response)).toEqual([]);
    });

    it("returns 404 for invalid token", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: `/api/unsubscribe/${UNKNOWN_TOKEN}`,
      });

      expect(response.statusCode).toBe(404);
      expect(parseJsonBody(response)).toEqual({
        message: "Subscription with unsubscribe token not found",
      });
    });

    it("returns 400 for malformed token param", async () => {
      const response = await apiRequest(ctx, {
        method: "GET",
        url: "/api/unsubscribe/not-a-token",
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("metrics", () => {
    it("exposes Prometheus metrics", async () => {
      await apiRequest(ctx, {
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      const response = await metricsRequest(ctx);

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("http_requests_total");
      expect(response.body).toContain("http_request_duration_seconds");
      expect(response.body).toContain('route="/api/subscriptions"');
    });
  });
});
