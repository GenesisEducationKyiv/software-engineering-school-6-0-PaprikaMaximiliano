import { describe, expect, test } from "vitest";
import {
  isValidEmail,
  isValidRepoFormat,
  isValidToken,
} from "../src/utils/validation.js";

describe("validation", () => {
  test("validates repository format", () => {
    expect(isValidRepoFormat("golang/go")).toBe(true);
    expect(isValidRepoFormat("badformat")).toBe(false);
    expect(isValidRepoFormat("owner/")).toBe(false);
  });

  test("validates email format", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  test("validates v4 uuid token", () => {
    expect(isValidToken("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    expect(isValidToken("not-a-token")).toBe(false);
  });
});
