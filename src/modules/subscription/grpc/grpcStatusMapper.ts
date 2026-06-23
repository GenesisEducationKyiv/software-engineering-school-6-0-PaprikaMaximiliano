import { status as GrpcStatus, type status as GrpcStatusType } from "@grpc/grpc-js";
import { OptimisticLockError, ResourceNotFoundError } from "../../../platform/errors";
import {
  GrpcInvalidArgumentError,
  GrpcUnauthenticatedError,
  GrpcUnavailableError,
} from "./grpcAuth";

export type GrpcErrorDetails = {
  code: number;
  message: string;
};

export function mapErrorToGrpcStatus(error: unknown): GrpcErrorDetails {
  if (error instanceof GrpcUnauthenticatedError) {
    return { code: GrpcStatus.UNAUTHENTICATED, message: error.message };
  }

  if (error instanceof GrpcUnavailableError) {
    return { code: GrpcStatus.UNAVAILABLE, message: error.message };
  }

  if (error instanceof OptimisticLockError) {
    return { code: GrpcStatus.ABORTED, message: error.message };
  }

  if (error instanceof GrpcInvalidArgumentError) {
    return { code: GrpcStatus.INVALID_ARGUMENT, message: error.message };
  }

  if (error instanceof ResourceNotFoundError) {
    return { code: GrpcStatus.NOT_FOUND, message: error.message };
  }

  if (error instanceof Error && error.message.includes("validation")) {
    return { code: GrpcStatus.INVALID_ARGUMENT, message: error.message };
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  return { code: GrpcStatus.INTERNAL, message };
}

export function mapGrpcStatusToError(code: GrpcStatusType, message: string): Error {
  if (code === GrpcStatus.ABORTED) {
    return new OptimisticLockError(message);
  }

  if (code === GrpcStatus.UNAUTHENTICATED) {
    return new GrpcUnauthenticatedError(message);
  }

  if (code === GrpcStatus.UNAVAILABLE) {
    return new GrpcUnavailableError(message);
  }

  if (code === GrpcStatus.NOT_FOUND) {
    return new ResourceNotFoundError(message);
  }

  if (code === GrpcStatus.INVALID_ARGUMENT) {
    return new Error(message);
  }

  return new Error(message || "gRPC request failed");
}
