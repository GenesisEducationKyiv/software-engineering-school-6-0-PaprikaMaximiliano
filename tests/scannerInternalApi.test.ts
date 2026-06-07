import Fastify from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OptimisticLockError } from "../src/platform/errors";
import { errorHandler } from "../src/platform/http/errorHandler";
import { createScannerInternalPlugin } from "../src/modules/subscription/api/scannerInternalPlugin";
import type { ScannerAccessService } from "../src/modules/subscription/application/ScannerAccessService";

const INTERNAL_API_KEY = "internal-test-key";

function createTestApp(
  service: ScannerAccessService,
  internalApiKey: string | null | undefined = INTERNAL_API_KEY,
) {
  const app = Fastify();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.setErrorHandler(errorHandler);

  app.register(createScannerInternalPlugin(service, internalApiKey ?? undefined), {
    prefix: "/internal/scanner",
  });

  return app;
}

describe("scanner internal API", () => {
  const repositoryId = "550e8400-e29b-41d4-a716-446655440000";

  const mockService = {
    listScanTargets: vi.fn(),
    updateLastSeenTag: vi.fn(),
  } as unknown as ScannerAccessService;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when internal api key is missing", async () => {
    const app = createTestApp(mockService);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/internal/scanner/scan-targets",
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 401 when internal api key is invalid", async () => {
    const app = createTestApp(mockService);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/internal/scanner/scan-targets",
      headers: { "x-api-key": "wrong-key" },
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("returns 503 when internal api key is not configured", async () => {
    const app = createTestApp(mockService, null);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/internal/scanner/scan-targets",
      headers: { "x-api-key": INTERNAL_API_KEY },
    });

    expect(response.statusCode).toBe(503);
    await app.close();
  });

  it("returns scan targets for authorized requests", async () => {
    const targets = [
      {
        id: repositoryId,
        fullName: "golang/go",
        lastSeenTag: "go1.22.0",
        subscribers: [{ email: "user@example.com", unsubscribeUrl: "http://localhost/unsub" }],
      },
    ];

    vi.mocked(mockService.listScanTargets).mockResolvedValue(targets);

    const app = createTestApp(mockService);
    await app.ready();

    const response = await app.inject({
      method: "GET",
      url: "/internal/scanner/scan-targets",
      headers: { "x-api-key": INTERNAL_API_KEY },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(targets);
    await app.close();
  });

  it("updates last seen tag for authorized requests", async () => {
    vi.mocked(mockService.updateLastSeenTag).mockResolvedValue();

    const app = createTestApp(mockService);
    await app.ready();

    const response = await app.inject({
      method: "PATCH",
      url: `/internal/scanner/repositories/${repositoryId}/last-seen-tag`,
      headers: {
        "x-api-key": INTERNAL_API_KEY,
        "content-type": "application/json",
      },
      payload: {
        previousLastSeenTag: "go1.22.0",
        newLastSeenTag: "go1.23.0",
      },
    });

    expect(response.statusCode).toBe(204);
    expect(mockService.updateLastSeenTag).toHaveBeenCalledWith({
      repositoryId,
      previousLastSeenTag: "go1.22.0",
      newLastSeenTag: "go1.23.0",
    });
    await app.close();
  });

  it("returns 409 when optimistic lock fails", async () => {
    vi.mocked(mockService.updateLastSeenTag).mockRejectedValue(new OptimisticLockError());

    const app = createTestApp(mockService);
    await app.ready();

    const response = await app.inject({
      method: "PATCH",
      url: `/internal/scanner/repositories/${repositoryId}/last-seen-tag`,
      headers: {
        "x-api-key": INTERNAL_API_KEY,
        "content-type": "application/json",
      },
      payload: {
        previousLastSeenTag: "go1.22.0",
        newLastSeenTag: "go1.23.0",
      },
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });
});
