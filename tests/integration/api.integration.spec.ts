import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app";
import { GitHubNotFoundError, GitHubRateLimitError } from "../../src/errors";
import { prisma } from "../../src/lib/prisma";
import type { IMailer } from "../../src/integrations/ports/IMailer";
import type { ISourceControlClient } from "../../src/integrations/ports/ISourceControlClient";
import type { ITokenGenerator } from "../../src/subscription/ports/ITokenGenerator";

const API_KEY = "integration-test-api-key";
const TEST_EMAIL = "integration@example.com";
const TEST_REPO = "octocat/hello-world";
const TEST_TAG = "v1.2.3";
const CONFIRM_TOKEN = "11111111-1111-4111-8111-111111111111";
const UNSUBSCRIBE_TOKEN = "22222222-2222-4222-8222-222222222222";
const UNKNOWN_TOKEN = "33333333-3333-4333-8333-333333333333";

type InjectResponse = {
  statusCode: number;
  body: string;
};

class RecordingMailer implements IMailer {
  confirmationEmails: Array<{
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }> = [];

  releaseEmails: Array<{
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }> = [];

  async sendConfirmationEmail(input: {
    to: string;
    repo: string;
    confirmUrl: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    this.confirmationEmails.push(input);
    return Promise.resolve();
  }

  async sendReleaseEmail(input: {
    to: string;
    repo: string;
    tag: string;
    unsubscribeUrl: string;
  }): Promise<void> {
    this.releaseEmails.push(input);
    return Promise.resolve();
  }

  reset(): void {
    this.confirmationEmails = [];
    this.releaseEmails = [];
  }
}

class DeterministicTokenGenerator implements ITokenGenerator {
  private index = 0;

  generate(): string {
    const tokens = [CONFIRM_TOKEN, UNSUBSCRIBE_TOKEN];
    const token = tokens[this.index % tokens.length];
    this.index += 1;
    return token;
  }

  reset(): void {
    this.index = 0;
  }
}

class FakeSourceControlClient implements ISourceControlClient {
  mode: "success" | "not-found" | "rate-limit" = "success";

  async getLatestReleaseTag(_: string): Promise<string | null> {
    if (this.mode === "not-found") {
      throw new GitHubNotFoundError();
    }

    if (this.mode === "rate-limit") {
      throw new GitHubRateLimitError({ retryAfterSeconds: 60 });
    }

    return Promise.resolve(TEST_TAG);
  }

  reset(): void {
    this.mode = "success";
  }
}

const mailer = new RecordingMailer();
const tokenGenerator = new DeterministicTokenGenerator();
const sourceControlClient = new FakeSourceControlClient();

const appPromise = buildApp({
  apiKey: API_KEY,
  appBaseUrl: "http://localhost:3000",
  enableScanner: false,
  mailer,
  githubClient: sourceControlClient,
  tokenGenerator,
});

function apiHeaders() {
  return {
    "x-api-key": API_KEY,
  };
}

async function apiRequest(options: {
  method: "GET" | "POST";
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<InjectResponse> {
  const app = await appPromise;

  return (await app.inject({
    method: options.method,
    url: options.url,
    body: options.body as never,
    headers: {
      ...apiHeaders(),
      ...options.headers,
    },
  })) as unknown as InjectResponse;
}

describe("API integration", () => {
  beforeAll(async () => {
    const app = await appPromise;
    await app.ready();
  });

  beforeEach(async () => {
    await prisma.subscription.deleteMany();
    await prisma.repository.deleteMany();
    mailer.reset();
    tokenGenerator.reset();
    sourceControlClient.reset();
  });

  afterAll(async () => {
    const app = await appPromise;
    await app.close();
    await prisma.$disconnect();
  });

  describe("auth", () => {
    it("rejects requests without API key", async () => {
      const app = await appPromise;
      const response = await app.inject({
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe("subscribe", () => {
    it("creates a subscription and sends confirmation email", async () => {
      const response = await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: "Subscription successful. Confirmation email sent.",
      });

      expect(mailer.confirmationEmails).toHaveLength(1);
      expect(mailer.confirmationEmails[0]).toMatchObject({
        to: TEST_EMAIL,
        repo: TEST_REPO,
        confirmUrl: `http://localhost:3000/api/confirm/${CONFIRM_TOKEN}`,
        unsubscribeUrl: `http://localhost:3000/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });
    });

    it("rejects duplicate subscription for same email and repo", async () => {
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      const response = await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body)).toEqual({
        message: "Email already subscribed to this repository",
      });
    });

    it("returns 404 when repository not found on GitHub", async () => {
      sourceControlClient.mode = "not-found";

      const response = await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        message: "Repository not found on GitHub",
      });
    });

    it("returns 503 when GitHub rate limit is hit", async () => {
      sourceControlClient.mode = "rate-limit";

      const response = await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      expect(response.statusCode).toBe(503);
      expect(JSON.parse(response.body)).toEqual({
        message: "GitHub API rate limit reached. Please retry later.",
      });
    });
  });

  describe("list subscriptions", () => {
    it("lists unconfirmed subscriptions for email", async () => {
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      const response = await apiRequest({
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual([
        {
          email: TEST_EMAIL,
          repo: TEST_REPO,
          confirmed: false,
          last_seen_tag: TEST_TAG,
        },
      ]);
    });

    it("shows confirmed status after confirmation", async () => {
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      await apiRequest({
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      const response = await apiRequest({
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(JSON.parse(response.body)).toEqual([
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
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      const response = await apiRequest({
        method: "GET",
        url: `/api/confirm/${CONFIRM_TOKEN}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: "Subscription confirmed successfully",
      });
    });

    it("returns 404 for invalid token", async () => {
      const response = await apiRequest({
        method: "GET",
        url: `/api/confirm/${UNKNOWN_TOKEN}`,
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        message: "Token not found",
      });
    });
  });

  describe("unsubscribe", () => {
    it("removes subscription", async () => {
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      const response = await apiRequest({
        method: "GET",
        url: `/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        message: "Unsubscribed successfully",
      });
    });

    it("returns empty list after unsubscribe", async () => {
      await apiRequest({
        method: "POST",
        url: "/api/subscribe",
        body: { email: TEST_EMAIL, repo: TEST_REPO },
      });

      await apiRequest({
        method: "GET",
        url: `/api/unsubscribe/${UNSUBSCRIBE_TOKEN}`,
      });

      const response = await apiRequest({
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      expect(JSON.parse(response.body)).toEqual([]);
    });

    it("returns 404 for invalid token", async () => {
      const response = await apiRequest({
        method: "GET",
        url: `/api/unsubscribe/${UNKNOWN_TOKEN}`,
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toEqual({
        message: "Token not found",
      });
    });
  });

  describe("metrics", () => {
    it("exposes Prometheus metrics", async () => {
      await apiRequest({
        method: "GET",
        url: `/api/subscriptions?email=${encodeURIComponent(TEST_EMAIL)}`,
      });

      const response = await (
        await appPromise
      ).inject({
        method: "GET",
        url: "/metrics",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain("http_requests_total");
      expect(response.body).toContain("http_request_duration_seconds");
    });
  });
});
