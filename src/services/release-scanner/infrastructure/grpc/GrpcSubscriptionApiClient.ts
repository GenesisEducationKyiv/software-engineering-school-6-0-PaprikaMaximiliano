import { credentials, Metadata, type ServiceError } from "@grpc/grpc-js";
import {
  ScannerAccessServiceClient,
  type ListScanTargetsRequest,
  type ListScanTargetsResponse,
  type UpdateLastSeenTagRequest,
  type UpdateLastSeenTagResponse,
} from "@/gen/scanner/v1/scanner_access";
import { createGrpcAuthMetadata } from "@/modules/subscription/grpc/grpcAuth";
import { mapGrpcStatusToError } from "@/modules/subscription/grpc/grpcStatusMapper";

function promisifyUnary<Request, Response>(
  call: (
    request: Request,
    metadata: Metadata,
    callback: (error: ServiceError | null, response: Response) => void,
  ) => void,
  request: Request,
  metadata: Metadata,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    call(request, metadata, (error, response) => {
      if (error) {
        reject(mapGrpcStatusToError(error.code, error.details || error.message));
        return;
      }

      resolve(response);
    });
  });
}

export class GrpcSubscriptionApiClient {
  private readonly client: ScannerAccessServiceClient;
  private readonly metadata: Metadata;

  constructor(
    address: string,
    apiKey: string,
    ClientCtor: typeof ScannerAccessServiceClient = ScannerAccessServiceClient,
  ) {
    this.client = new ClientCtor(address, credentials.createInsecure());
    this.metadata = createGrpcAuthMetadata(apiKey);
  }

  listScanTargets(request: ListScanTargetsRequest = {}): Promise<ListScanTargetsResponse> {
    return promisifyUnary(this.client.listScanTargets.bind(this.client), request, this.metadata);
  }

  updateLastSeenTag(request: UpdateLastSeenTagRequest): Promise<UpdateLastSeenTagResponse> {
    return promisifyUnary(this.client.updateLastSeenTag.bind(this.client), request, this.metadata);
  }

  close(): void {
    this.client.close();
  }
}
