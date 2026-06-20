import { prisma } from "../../persistence/prisma";
import type { ISagaStateStore } from "../ports/ISagaStateStore";
import { SAGA_STATUS } from "../types";

export class PrismaSagaStateStore implements ISagaStateStore {
  async create(input: { type: string; payload: unknown }): Promise<string> {
    const saga = await prisma.sagaInstance.create({
      data: {
        type: input.type,
        status: SAGA_STATUS.RUNNING,
        payload: input.payload as object,
        completedSteps: [],
      },
    });

    return saga.id;
  }

  async updateProgress(
    sagaId: string,
    currentStep: string,
    completedSteps: string[],
  ): Promise<void> {
    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        currentStep,
        completedSteps,
      },
    });
  }

  async markCompleted(sagaId: string, completedSteps: string[]): Promise<void> {
    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: SAGA_STATUS.COMPLETED,
        completedSteps,
        currentStep: null,
      },
    });
  }

  async markCompensating(sagaId: string): Promise<void> {
    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: SAGA_STATUS.COMPENSATING,
      },
    });
  }

  async markCompensated(sagaId: string): Promise<void> {
    await prisma.sagaInstance.update({
      where: { id: sagaId },
      data: {
        status: SAGA_STATUS.COMPENSATED,
        currentStep: null,
      },
    });
  }
}
