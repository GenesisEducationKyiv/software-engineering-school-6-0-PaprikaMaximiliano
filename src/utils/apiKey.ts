import { timingSafeEqual } from "node:crypto";

function toSingleHeaderValue(value: string | string[] | undefined): string | null {
  if (typeof value === "string") {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0) {
    return value[0]?.trim() ?? null;
  }
  return null;
}

function safeCompare(secret: string, provided: string): boolean {
  const secretBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);

  if (secretBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(secretBuffer, providedBuffer);
}

export function extractProvidedApiKey(headers: {
  authorization?: string | string[];
  "x-api-key"?: string | string[];
}): string | null {
  const xApiKey = toSingleHeaderValue(headers["x-api-key"]);
  if (xApiKey) {
    return xApiKey;
  }

  const authorization = toSingleHeaderValue(headers.authorization);
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export function isAuthorizedApiKey(
  headers: {
    authorization?: string | string[];
    "x-api-key"?: string | string[];
  },
  expectedApiKey: string,
): boolean {
  const providedApiKey = extractProvidedApiKey(headers);
  if (!providedApiKey) {
    return false;
  }

  return safeCompare(expectedApiKey, providedApiKey);
}
