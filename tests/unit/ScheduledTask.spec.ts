import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ScheduledTask } from "@/platform/scheduling/ScheduledTask";
import { ILogger } from "@/platform/logger/ILogger";

describe("ScheduledTask", () => {
  const mockLogger = {
    error: vi.fn(),
  } as unknown as ILogger;

  const intervalMs = 1000;
  let taskMock: ReturnType<typeof vi.fn>;
  let scheduledTask: ScheduledTask;

  beforeEach(() => {
    vi.useFakeTimers();
    taskMock = vi.fn().mockResolvedValue(undefined);
    scheduledTask = new ScheduledTask(taskMock as () => Promise<void>, intervalMs, mockLogger);
  });

  afterEach(() => {
    scheduledTask.stop();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("should run the task immediately upon starting", async () => {
    scheduledTask.start();

    await vi.waitFor(() => expect(taskMock).toHaveBeenCalledTimes(1));

    expect(taskMock).toHaveBeenCalledTimes(1);
  });

  it("should schedule the next run after the previous one finishes", async () => {
    scheduledTask.start();

    await vi.waitFor(() => expect(taskMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  it("should log an error and continue scheduling if the task fails", async () => {
    const error = new Error("Task failed");
    taskMock.mockRejectedValueOnce(error);

    scheduledTask.start();

    await vi.waitFor(() => expect(mockLogger.error).toHaveBeenCalled());

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error }),
      "scheduled task failed",
    );

    await vi.advanceTimersByTimeAsync(intervalMs);
    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  it("should not start multiple timers if start() is called twice", async () => {
    scheduledTask.start();
    scheduledTask.start();

    await vi.waitFor(() => expect(taskMock).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(intervalMs);

    expect(taskMock).toHaveBeenCalledTimes(2);
  });

  it("should stop execution when stop() is called", async () => {
    scheduledTask.start();
    await vi.waitFor(() => expect(taskMock).toHaveBeenCalledTimes(1));

    scheduledTask.stop();

    await vi.advanceTimersByTimeAsync(intervalMs * 2);

    expect(taskMock).toHaveBeenCalledTimes(1);
  });
});
