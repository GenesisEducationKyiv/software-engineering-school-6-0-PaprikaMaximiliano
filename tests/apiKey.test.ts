import { describe, expect, it } from "vitest";
import { extractProvidedApiKey, isAuthorizedApiKey } from "../src/utils/apiKey.js";

describe("extractProvidedApiKey", () => {
  it("reads token from x-api-key header", () => {
    const result = extractProvidedApiKey({ "x-api-key": "secret-key" });
    expect(result).toBe("secret-key");
  });

  it("reads token from Authorization Bearer header", () => {
    const result = extractProvidedApiKey({
      authorization: "Bearer another-secret",
    });
    expect(result).toBe("another-secret");
  });

  it("returns null for unsupported authorization scheme", () => {
    const result = extractProvidedApiKey({
      authorization: "Basic something",
    });
    expect(result).toBeNull();
  });
});

describe("isAuthorizedApiKey", () => {
  it("returns true when token matches", () => {
    const result = isAuthorizedApiKey({ "x-api-key": "my-token" }, "my-token");

    expect(result).toBe(true);
  });

  it("returns false when token does not match", () => {
    const result = isAuthorizedApiKey({ authorization: "Bearer wrong-token" }, "my-token");

    expect(result).toBe(false);
  });

  it("returns false when token is missing", () => {
    const result = isAuthorizedApiKey({}, "my-token");
    expect(result).toBe(false);
  });
});
