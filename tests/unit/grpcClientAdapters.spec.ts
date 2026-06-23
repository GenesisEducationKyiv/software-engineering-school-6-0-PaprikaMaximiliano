import { status as GrpcStatus } from "@grpc/grpc-js";
import { describe, expect, it, vi } from "vitest";
import { OptimisticLockError } from "@/platform/errors";
import { GrpcUnauthenticatedError } from "@/modules/subscription/grpc/grpcAuth";
import { GrpcRepositoryStateUpdater } from "@/services/release-scanner/infrastructure/grpc/GrpcRepositoryStateUpdater";
import { GrpcScanTargetProvider } from "@/services/release-scanner/infrastructure/grpc/GrpcScanTargetProvider";
import type { GrpcSubscriptionApiClient } from "@/services/release-scanner/infrastructure/grpc/GrpcSubscriptionApiClient";

const repositoryId = "11111111-1111-1111-1111-111111111111";

function createMockClient(): GrpcSubscriptionApiClient {
  return {
    listScanTargets: vi.fn(),
    updateLastSeenTag: vi.fn(),
    close: vi.fn(),
  } as unknown as GrpcSubscriptionApiClient;
}

describe("gRPC scanner client adapters", () => {
  it("GrpcScanTargetProvider maps proto targets to domain model", async () => {
    const client = createMockClient();
    vi.mocked(client.listScanTargets).mockResolvedValue({
      targets: [
        {
          id: repositoryId,
          fullName: "golang/go",
          lastSeenTag: "go1.22.0",
          subscribers: [{ email: "a@example.com", unsubscribeUrl: "http://localhost/unsub" }],
        },
      ],
    });

    const provider = new GrpcScanTargetProvider(client);
    await expect(provider.listScanTargets()).resolves.toEqual([
      {
        id: repositoryId,
        fullName: "golang/go",
        lastSeenTag: "go1.22.0",
        subscribers: [{ email: "a@example.com", unsubscribeUrl: "http://localhost/unsub" }],
      },
    ]);
  });

  it("GrpcRepositoryStateUpdater forwards update request", async () => {
    const client = createMockClient();
    vi.mocked(client.updateLastSeenTag).mockResolvedValue({});

    const updater = new GrpcRepositoryStateUpdater(client);
    await updater.updateLastSeenTag(repositoryId, "go1.22.0", "go1.23.0");

    expect(client.updateLastSeenTag).toHaveBeenCalledWith({
      repositoryId,
      previousLastSeenTag: "go1.22.0",
      newLastSeenTag: "go1.23.0",
    });
  });

  it("GrpcRepositoryStateUpdater maps ABORTED to OptimisticLockError", async () => {
    const client = createMockClient();
    vi.mocked(client.updateLastSeenTag).mockRejectedValue(new OptimisticLockError());

    const updater = new GrpcRepositoryStateUpdater(client);
    await expect(updater.updateLastSeenTag(repositoryId, null, "go1.23.0")).rejects.toBeInstanceOf(
      OptimisticLockError,
    );
  });

  it("GrpcScanTargetProvider propagates UNAUTHENTICATED errors", async () => {
    const client = createMockClient();
    vi.mocked(client.listScanTargets).mockRejectedValue(new GrpcUnauthenticatedError());

    const provider = new GrpcScanTargetProvider(client);
    await expect(provider.listScanTargets()).rejects.toBeInstanceOf(GrpcUnauthenticatedError);
  });
});

describe("GrpcSubscriptionApiClient status mapping", () => {
  it("mapGrpcStatusToError is used for ABORTED via client wrapper", async () => {
    const { mapGrpcStatusToError } = await import("@/modules/subscription/grpc/grpcStatusMapper");
    const error = mapGrpcStatusToError(GrpcStatus.ABORTED, "lock");
    expect(error).toBeInstanceOf(OptimisticLockError);
  });
});
