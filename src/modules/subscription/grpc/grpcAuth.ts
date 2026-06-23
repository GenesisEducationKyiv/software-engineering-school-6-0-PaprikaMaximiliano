import { Metadata } from "@grpc/grpc-js";
import { extractProvidedApiKey, isAuthorizedApiKey } from "../../../platform/http/apiKey";

export class GrpcInvalidArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GrpcInvalidArgumentError";
  }
}

export class GrpcUnauthenticatedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "GrpcUnauthenticatedError";
  }
}

export class GrpcUnavailableError extends Error {
  constructor(message = "Internal scanner API is not configured") {
    super(message);
    this.name = "GrpcUnavailableError";
  }
}

function metadataToHeaders(metadata: Metadata): {
  authorization?: string;
  "x-api-key"?: string;
} {
  const headers: {
    authorization?: string;
    "x-api-key"?: string;
  } = {};

  const xApiKey = metadata.get("x-api-key");
  if (xApiKey.length > 0 && typeof xApiKey[0] === "string") {
    headers["x-api-key"] = xApiKey[0];
  }

  const authorization = metadata.get("authorization");
  if (authorization.length > 0 && typeof authorization[0] === "string") {
    headers.authorization = authorization[0];
  }

  return headers;
}

export function assertGrpcAuthorized(
  metadata: Metadata,
  internalApiKey: string | null | undefined,
): void {
  if (!internalApiKey) {
    throw new GrpcUnavailableError();
  }

  const headers = metadataToHeaders(metadata);
  if (!isAuthorizedApiKey(headers, internalApiKey)) {
    throw new GrpcUnauthenticatedError();
  }
}

export function createGrpcAuthMetadata(apiKey: string): Metadata {
  const metadata = new Metadata();
  metadata.set("x-api-key", apiKey);
  return metadata;
}

export function extractApiKeyFromMetadata(metadata: Metadata): string | null {
  return extractProvidedApiKey(metadataToHeaders(metadata));
}
