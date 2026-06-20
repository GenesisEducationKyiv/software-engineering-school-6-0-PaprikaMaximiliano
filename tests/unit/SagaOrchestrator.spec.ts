import { describe, it, expect, vi, beforeEach } from "vitest";
import { SagaOrchestrator } from "@/platform/saga/SagaOrchestrator";
import type { ISagaStateStore } from "@/platform/saga/ports/ISagaStateStore";
import type { SagaStep } from "@/platform/saga/types";

describe("SagaOrchestrator", () => {
  const mockStateStore = {
    create: vi.fn(),
    updateProgress: vi.fn(),
    markCompleted: vi.fn(),
    markCompensating: vi.fn(),
    markCompensated: vi.fn(),
  } as unknown as ISagaStateStore;

  let orchestrator: SagaOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockStateStore.create).mockResolvedValue("saga-1");
    orchestrator = new SagaOrchestrator(mockStateStore);
  });

  it("executes all steps and marks saga completed on success", async () => {
    const context = { value: 0 };
    const step1Execute = vi.fn(() => {
      context.value += 1;
      return Promise.resolve();
    });
    const step2Execute = vi.fn(() => {
      context.value += 2;
      return Promise.resolve();
    });

    const steps: SagaStep<typeof context>[] = [
      {
        name: "StepOne",
        execute: step1Execute,
        compensate: vi.fn(),
      },
      {
        name: "StepTwo",
        execute: step2Execute,
        compensate: vi.fn(),
      },
    ];

    await orchestrator.run({
      type: "TEST_SAGA",
      payload: { test: true },
      context,
      steps,
    });

    expect(mockStateStore.create).toHaveBeenCalledWith({
      type: "TEST_SAGA",
      payload: { test: true },
    });
    expect(step1Execute).toHaveBeenCalledWith(context, "saga-1");
    expect(step2Execute).toHaveBeenCalledWith(context, "saga-1");
    expect(mockStateStore.markCompleted).toHaveBeenCalledWith("saga-1", ["StepOne", "StepTwo"]);
    expect(context.value).toBe(3);
  });

  it("compensates completed steps in reverse order when a step fails", async () => {
    const compensateStep1 = vi.fn();
    const compensateStep2 = vi.fn();

    const steps: SagaStep<{ marker: string }>[] = [
      {
        name: "StepOne",
        execute: vi.fn(),
        compensate: compensateStep1,
      },
      {
        name: "StepTwo",
        execute: vi.fn(),
        compensate: compensateStep2,
      },
      {
        name: "StepThree",
        execute: vi.fn().mockRejectedValue(new Error("step three failed")),
        compensate: vi.fn(),
      },
    ];

    await expect(
      orchestrator.run({
        type: "TEST_SAGA",
        payload: {},
        context: { marker: "x" },
        steps,
      }),
    ).rejects.toThrow("step three failed");

    expect(mockStateStore.markCompensating).toHaveBeenCalledWith("saga-1");
    expect(compensateStep2).toHaveBeenCalledBefore(compensateStep1);
    expect(compensateStep1).toHaveBeenCalledOnce();
    expect(compensateStep2).toHaveBeenCalledOnce();
    expect(mockStateStore.markCompensated).toHaveBeenCalledWith("saga-1");
    expect(mockStateStore.markCompleted).not.toHaveBeenCalled();
  });
});
