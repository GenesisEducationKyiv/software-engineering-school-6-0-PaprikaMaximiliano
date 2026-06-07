import { describe, expect, it, vi } from "vitest";
import { OptimisticLockError } from "../src/platform/errors";
import { HttpRepositoryStateUpdater } from "../src/services/release-scanner/infrastructure/HttpRepositoryStateUpdater";
import { HttpScanTargetProvider } from "../src/services/release-scanner/infrastructure/HttpScanTargetProvider";
import { SubscriptionApiClient } from "../src/services/release-scanner/infrastructure/SubscriptionApiClient";

const repositoryId = "11111111-1111-1111-1111-111111111111";

function createMockFetch(response: Partial<Response>): typeof fetch {
  return vi.fn().mockResolvedValue(response) as unknown as typeof fetch;
}

describe("SubscriptionApiClient adapters", () => {
  it("HttpScanTargetProvider fetches scan targets", async () => {
    const targets = [
      {
        id: repositoryId,
        fullName: "golang/go",
        lastSeenTag: null,
        subscribers: [],
      },
    ];

    const fetchFn = createMockFetch({
      ok: true,
      json: () => Promise.resolve(targets),
    });

    const client = new SubscriptionApiClient("http://app:3000", "internal-key", fetchFn);
    const provider = new HttpScanTargetProvider(client);

    await expect(provider.listScanTargets()).resolves.toEqual(targets);
    expect(fetchFn).toHaveBeenCalledWith("http://app:3000/internal/scanner/scan-targets", {
      headers: { "x-api-key": "internal-key" },
    });
  });

  it("HttpScanTargetProvider throws when fetch fails", async () => {
    const fetchFn = createMockFetch({ ok: false, status: 500 });
    const client = new SubscriptionApiClient("http://app:3000", "internal-key", fetchFn);
    const provider = new HttpScanTargetProvider(client);

    await expect(provider.listScanTargets()).rejects.toThrow("Failed to fetch scan targets: 500");
  });

  it("HttpRepositoryStateUpdater patches last seen tag", async () => {
    const fetchFn = createMockFetch({ ok: true, status: 204 });
    const client = new SubscriptionApiClient("http://app:3000", "internal-key", fetchFn);
    const updater = new HttpRepositoryStateUpdater(client);

    await updater.updateLastSeenTag(repositoryId, "go1.22.0", "go1.23.0");

    expect(fetchFn).toHaveBeenCalledWith(
      `http://app:3000/internal/scanner/repositories/${repositoryId}/last-seen-tag`,
      {
        method: "PATCH",
        headers: {
          "x-api-key": "internal-key",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          previousLastSeenTag: "go1.22.0",
          newLastSeenTag: "go1.23.0",
        }),
      },
    );
  });

  it("HttpRepositoryStateUpdater maps 409 to OptimisticLockError", async () => {
    const fetchFn = createMockFetch({ ok: false, status: 409 });
    const client = new SubscriptionApiClient("http://app:3000", "internal-key", fetchFn);
    const updater = new HttpRepositoryStateUpdater(client);

    await expect(updater.updateLastSeenTag(repositoryId, null, "go1.23.0")).rejects.toBeInstanceOf(
      OptimisticLockError,
    );
  });

  it("HttpRepositoryStateUpdater throws on other failures", async () => {
    const fetchFn = createMockFetch({ ok: false, status: 500 });
    const client = new SubscriptionApiClient("http://app:3000", "internal-key", fetchFn);
    const updater = new HttpRepositoryStateUpdater(client);

    await expect(updater.updateLastSeenTag(repositoryId, null, "go1.23.0")).rejects.toThrow(
      "Failed to update last seen tag: 500",
    );
  });
});
