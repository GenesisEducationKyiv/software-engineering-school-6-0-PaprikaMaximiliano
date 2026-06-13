import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubClient } from "@/platform/integrations/GithubClient";
import { GitHubNotFoundError } from "@/platform/errors";

const mockFetch = vi.fn();

describe("GitHubClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("getLatestReleaseTag", () => {
    it("returns the tag name on successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => await Promise.resolve({ tag_name: "v1.0.0" }),
      });

      const client = new GitHubClient();
      const result = await client.getLatestReleaseTag("facebook/react");

      expect(result).toBe("v1.0.0");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/facebook/react/releases/latest",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("includes the authorization header when initialized with a token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => await Promise.resolve({ tag_name: "v1.0.0" }),
      });

      const client = new GitHubClient("secret-token");
      await client.getLatestReleaseTag("facebook/react");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer secret-token",
          }),
        }),
      );
    });

    it("throws GitHubNotFoundError when API returns 404", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      });

      const client = new GitHubClient();

      await expect(client.getLatestReleaseTag("facebook/react")).rejects.toThrow(
        GitHubNotFoundError,
      );
    });

    it("throws a generic error for unhandled non-ok responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      });

      const client = new GitHubClient();

      await expect(client.getLatestReleaseTag("facebook/react")).rejects.toThrow(
        "GitHub release lookup failed with 500",
      );
    });
  });

  describe("Rate Limiting & Retry-After Math", () => {
    it("throws GitHubRateLimitError and prefers the retry-after header (Status 429)", async () => {
      const headers = new Headers();
      headers.set("retry-after", "30");

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers,
      });

      const client = new GitHubClient();

      await expect(client.getLatestReleaseTag("facebook/react")).rejects.toMatchObject({
        info: { retryAfterSeconds: 30 },
      });
    });

    it("calculates wait time from x-ratelimit-reset header on 403 when remaining is 0", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const nowEpoch = Math.floor(Date.now() / 1000);
      const resetEpoch = nowEpoch + 45;

      const headers = new Headers();
      headers.set("x-ratelimit-remaining", "0");
      headers.set("x-ratelimit-reset", resetEpoch.toString());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers,
      });

      const client = new GitHubClient();

      await expect(client.getLatestReleaseTag("facebook/react")).rejects.toMatchObject({
        info: { retryAfterSeconds: 45 },
      });
    });

    it("enforces a minimum of 1 second wait if x-ratelimit-reset is in the past", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));

      const nowEpoch = Math.floor(Date.now() / 1000);
      const pastEpoch = nowEpoch - 100;

      const headers = new Headers();
      headers.set("x-ratelimit-remaining", "0");
      headers.set("x-ratelimit-reset", pastEpoch.toString());

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        headers,
      });

      const client = new GitHubClient();

      await expect(client.getLatestReleaseTag("facebook/react")).rejects.toMatchObject({
        info: { retryAfterSeconds: 1 },
      });
    });
  });
});
