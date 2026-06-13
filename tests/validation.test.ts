import { describe, expect, test } from "vitest";
import { emailSchema, repoSchema, tokenSchema, subscribeRequestSchema } from "../src/schemas";
import { ZodError } from "zod";

describe("validation", () => {
  test("validates repository format", () => {
    expect(() => repoSchema.parse("golang/go")).not.toThrow();
    expect(() => repoSchema.parse("badformat")).toThrow(ZodError);
    expect(() => repoSchema.parse("owner/")).toThrow(ZodError);
  });

  test("validates email format", () => {
    expect(() => emailSchema.parse("user@example.com")).not.toThrow();
    expect(() => emailSchema.parse("userexample.com")).toThrow(ZodError);
  });

  test("validates v4 uuid token", () => {
    expect(() => tokenSchema.parse("123e4567-e89b-42d3-a456-426614174000")).not.toThrow();
    expect(() => tokenSchema.parse("not-a-token")).toThrow(ZodError);
  });

  test("validates complete subscribe request", () => {
    expect(() =>
      subscribeRequestSchema.parse({ email: "user@example.com", repo: "golang/go" }),
    ).not.toThrow();
    expect(() => subscribeRequestSchema.parse({ email: "invalid", repo: "golang/go" })).toThrow(
      ZodError,
    );
    expect(() =>
      subscribeRequestSchema.parse({ email: "user@example.com", repo: "invalid" }),
    ).toThrow(ZodError);
  });
});
