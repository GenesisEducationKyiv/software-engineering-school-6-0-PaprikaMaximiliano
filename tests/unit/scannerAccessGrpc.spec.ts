import { credentials, Metadata, status as GrpcStatus } from "@grpc/grpc-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptimisticLockError } from "@/platform/errors";
import type { ScannerAccessService } from "@/modules/subscription/application/ScannerAccessService";
import { createScannerAccessGrpcHandlers } from "@/modules/subscription/grpc/scannerAccessGrpcHandlers";
import { createScannerAccessGrpcServer } from "@/modules/subscription/grpc/scannerAccessGrpcServer";
import { ScannerAccessServiceClient } from "@/gen/scanner/v1/scanner_access";

const INTERNAL_API_KEY = "internal-test-key";
const repositoryId = "clp9k3x2z0000qj8x00000000";

function createMockService(): ScannerAccessService {
  return {
    listScanTargets: vi.fn().mockResolvedValue([
      {
        id: repositoryId,
        fullName: "golang/go",
        lastSeenTag: null,
        subscribers: [],
      },
    ]),
    updateLastSeenTag: vi.fn().mockResolvedValue(undefined),
  } as unknown as ScannerAccessService;
}

describe("scanner access gRPC server", () => {
  let grpcServer: ReturnType<typeof createScannerAccessGrpcServer> | null = null;

  afterEach(async () => {
    if (grpcServer) {
      await grpcServer.stop();
      grpcServer = null;
    }
  });

  async function startServer(service: ScannerAccessService, apiKey = INTERNAL_API_KEY) {
    const port = 50000 + Math.floor(Math.random() * 1000);
    grpcServer = createScannerAccessGrpcServer(service, apiKey, port, "127.0.0.1");
    await grpcServer.start();
    return port;
  }

  function createClient(port: number) {
    return new ScannerAccessServiceClient(`127.0.0.1:${port}`, credentials.createInsecure());
  }

  function authMetadata() {
    const metadata = new Metadata();
    metadata.set("x-api-key", INTERNAL_API_KEY);
    return metadata;
  }

  it("returns scan targets when authorized", async () => {
    const service = createMockService();
    const port = await startServer(service);
    const client = createClient(port);

    const response = await new Promise((resolve, reject) => {
      client.listScanTargets({}, authMetadata(), (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });

    expect(response).toEqual({
      targets: [
        {
          id: repositoryId,
          fullName: "golang/go",
          lastSeenTag: undefined,
          subscribers: [],
        },
      ],
    });
    client.close();
  });

  it("returns UNAUTHENTICATED without api key", async () => {
    const service = createMockService();
    const port = await startServer(service);
    const client = createClient(port);

    await expect(
      new Promise((resolve, reject) => {
        client.listScanTargets({}, (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        });
      }),
    ).rejects.toMatchObject({ code: GrpcStatus.UNAUTHENTICATED });

    client.close();
  });

  it("maps OptimisticLockError to ABORTED on update", async () => {
    const service = createMockService();
    vi.mocked(service.updateLastSeenTag).mockRejectedValue(new OptimisticLockError());
    const port = await startServer(service);
    const client = createClient(port);

    await expect(
      new Promise((resolve, reject) => {
        client.updateLastSeenTag(
          {
            repositoryId,
            newLastSeenTag: "go1.23.0",
          },
          authMetadata(),
          (error, result) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(result);
          },
        );
      }),
    ).rejects.toMatchObject({ code: GrpcStatus.ABORTED });

    client.close();
  });
});

describe("scanner access gRPC handlers validation", () => {
  it("rejects empty repository id with INVALID_ARGUMENT", async () => {
    const handlers = createScannerAccessGrpcHandlers(createMockService(), INTERNAL_API_KEY);
    const metadata = new Metadata();
    metadata.set("x-api-key", INTERNAL_API_KEY);

    await expect(
      new Promise((resolve, reject) => {
        handlers.updateLastSeenTag(
          {
            request: { repositoryId: "  ", newLastSeenTag: "go1.23.0" },
            metadata,
          } as never,
          (error, response) => {
            if (error) {
              const message =
                "details" in error && error.details
                  ? String(error.details)
                  : "message" in error && error.message
                    ? String(error.message)
                    : "gRPC error";
              reject(Object.assign(new Error(message), { code: error.code }));
              return;
            }
            resolve(response);
          },
        );
      }),
    ).rejects.toMatchObject({ code: GrpcStatus.INVALID_ARGUMENT });
  });
});
