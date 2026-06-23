import { status as GrpcStatus } from "@grpc/grpc-js";
import { describe, expect, it } from "vitest";
import { OptimisticLockError, ResourceNotFoundError } from "@/platform/errors";
import {
  GrpcUnauthenticatedError,
  GrpcUnavailableError,
} from "@/modules/subscription/grpc/grpcAuth";
import {
  mapErrorToGrpcStatus,
  mapGrpcStatusToError,
} from "@/modules/subscription/grpc/grpcStatusMapper";

describe("grpcStatusMapper", () => {
  describe("mapErrorToGrpcStatus", () => {
    it("maps GrpcUnauthenticatedError to UNAUTHENTICATED", () => {
      const result = mapErrorToGrpcStatus(new GrpcUnauthenticatedError());
      expect(result.code).toBe(GrpcStatus.UNAUTHENTICATED);
    });

    it("maps GrpcUnavailableError to UNAVAILABLE", () => {
      const result = mapErrorToGrpcStatus(new GrpcUnavailableError());
      expect(result.code).toBe(GrpcStatus.UNAVAILABLE);
    });

    it("maps OptimisticLockError to ABORTED", () => {
      const result = mapErrorToGrpcStatus(new OptimisticLockError());
      expect(result.code).toBe(GrpcStatus.ABORTED);
    });

    it("maps ResourceNotFoundError to NOT_FOUND", () => {
      const result = mapErrorToGrpcStatus(new ResourceNotFoundError("missing"));
      expect(result.code).toBe(GrpcStatus.NOT_FOUND);
    });

    it("maps validation errors to INVALID_ARGUMENT", () => {
      const result = mapErrorToGrpcStatus(new Error("validation failed for field"));
      expect(result.code).toBe(GrpcStatus.INVALID_ARGUMENT);
    });

    it("maps unknown errors to INTERNAL", () => {
      const result = mapErrorToGrpcStatus(new Error("unexpected"));
      expect(result.code).toBe(GrpcStatus.INTERNAL);
    });
  });

  describe("mapGrpcStatusToError", () => {
    it("maps ABORTED to OptimisticLockError", () => {
      const error = mapGrpcStatusToError(GrpcStatus.ABORTED, "conflict");
      expect(error).toBeInstanceOf(OptimisticLockError);
    });

    it("maps UNAUTHENTICATED to GrpcUnauthenticatedError", () => {
      const error = mapGrpcStatusToError(GrpcStatus.UNAUTHENTICATED, "bad key");
      expect(error).toBeInstanceOf(GrpcUnauthenticatedError);
    });

    it("maps UNAVAILABLE to GrpcUnavailableError", () => {
      const error = mapGrpcStatusToError(GrpcStatus.UNAVAILABLE, "down");
      expect(error).toBeInstanceOf(GrpcUnavailableError);
    });

    it("maps NOT_FOUND to ResourceNotFoundError", () => {
      const error = mapGrpcStatusToError(GrpcStatus.NOT_FOUND, "missing");
      expect(error).toBeInstanceOf(ResourceNotFoundError);
    });
  });
});
