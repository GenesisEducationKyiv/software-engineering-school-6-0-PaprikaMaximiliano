import { type handleUnaryCall, type sendUnaryData } from "@grpc/grpc-js";
import { GrpcInvalidArgumentError } from "./grpcAuth";
import type {
  ListScanTargetsRequest,
  ListScanTargetsResponse,
  ScanTarget as GrpcScanTarget,
  UpdateLastSeenTagRequest,
  UpdateLastSeenTagResponse,
} from "@/gen/scanner/v1/scanner_access";
import type { ScanTarget } from "../contracts/scannerContracts";
import type { ScannerAccessService } from "../application/ScannerAccessService";
import { assertGrpcAuthorized } from "./grpcAuth";
import { mapErrorToGrpcStatus } from "./grpcStatusMapper";

function toGrpcScanTarget(target: ScanTarget): GrpcScanTarget {
  return {
    id: target.id,
    fullName: target.fullName,
    lastSeenTag: target.lastSeenTag ?? undefined,
    subscribers: target.subscribers.map((subscriber) => ({
      email: subscriber.email,
      unsubscribeUrl: subscriber.unsubscribeUrl,
    })),
  };
}

function handleGrpcError(error: unknown, callback: sendUnaryData<never>): void {
  const { code, message } = mapErrorToGrpcStatus(error);
  callback({ code, message } as Parameters<typeof callback>[0], null);
}

export function createScannerAccessGrpcHandlers(
  service: ScannerAccessService,
  internalApiKey: string | null | undefined,
): {
  listScanTargets: handleUnaryCall<ListScanTargetsRequest, ListScanTargetsResponse>;
  updateLastSeenTag: handleUnaryCall<UpdateLastSeenTagRequest, UpdateLastSeenTagResponse>;
} {
  const listScanTargets: handleUnaryCall<ListScanTargetsRequest, ListScanTargetsResponse> = (
    call,
    callback,
  ) => {
    void (async () => {
      try {
        assertGrpcAuthorized(call.metadata, internalApiKey);
        const targets = await service.listScanTargets();
        callback(null, { targets: targets.map(toGrpcScanTarget) });
      } catch (error) {
        handleGrpcError(error, callback);
      }
    })();
  };

  const updateLastSeenTag: handleUnaryCall<UpdateLastSeenTagRequest, UpdateLastSeenTagResponse> = (
    call,
    callback,
  ) => {
    void (async () => {
      try {
        assertGrpcAuthorized(call.metadata, internalApiKey);
        const request = call.request;

        if (!request.repositoryId?.trim()) {
          throw new GrpcInvalidArgumentError("repository_id is required");
        }

        if (!request.newLastSeenTag?.trim()) {
          throw new GrpcInvalidArgumentError("new_last_seen_tag is required");
        }

        await service.updateLastSeenTag({
          repositoryId: request.repositoryId,
          previousLastSeenTag: request.previousLastSeenTag ?? null,
          newLastSeenTag: request.newLastSeenTag,
        });

        callback(null, {});
      } catch (error) {
        handleGrpcError(error, callback);
      }
    })();
  };

  return { listScanTargets, updateLastSeenTag };
}
