import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimitPauser } from "@/platform/scheduling/RateLimitPauser";

describe("RateLimitPauser", () => {
  let pauser: RateLimitPauser;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    pauser = new RateLimitPauser();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initially not be paused", () => {
    expect(pauser.isPaused()).toBe(false);
    expect(pauser.getRemainingPauseMs()).toBe(0);
  });

  it("should pause for the specified number of seconds", () => {
    const pauseDurationSeconds = 30;
    pauser.pause(pauseDurationSeconds);

    expect(pauser.isPaused()).toBe(true);
    expect(pauser.getRemainingPauseMs()).toBe(30000);
  });

  it("should remain paused as time progresses but before duration expires", () => {
    pauser.pause(60);

    vi.advanceTimersByTime(59000);

    expect(pauser.isPaused()).toBe(true);
    expect(pauser.getRemainingPauseMs()).toBe(1000);
  });

  it("should unpause once the duration has passed", () => {
    pauser.pause(10);

    vi.advanceTimersByTime(10000);

    expect(pauser.isPaused()).toBe(false);
    expect(pauser.getRemainingPauseMs()).toBe(0);
  });

  it("should overwrite an existing pause with a newer one", () => {
    pauser.pause(10);
    pauser.pause(60);

    expect(pauser.getRemainingPauseMs()).toBe(60000);
  });
});
