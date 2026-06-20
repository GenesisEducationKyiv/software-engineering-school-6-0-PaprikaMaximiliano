import type { ISagaStateStore } from "./ports/ISagaStateStore";
import type { SagaRunOptions, SagaStep } from "./types";

export class SagaOrchestrator {
  constructor(private readonly stateStore: ISagaStateStore) {}

  async run<TContext>(options: SagaRunOptions<TContext>): Promise<void> {
    const sagaId = await this.stateStore.create({
      type: options.type,
      payload: options.payload,
    });

    const completedSteps: string[] = [];

    try {
      for (const step of options.steps) {
        await this.stateStore.updateProgress(sagaId, step.name, completedSteps);
        await step.execute(options.context, sagaId);
        completedSteps.push(step.name);
      }

      await this.stateStore.markCompleted(sagaId, completedSteps);
    } catch (error) {
      await this.compensateSteps(sagaId, options.context, options.steps, completedSteps);
      throw error;
    }
  }

  private async compensateSteps<TContext>(
    sagaId: string,
    context: TContext,
    steps: SagaStep<TContext>[],
    completedSteps: string[],
  ): Promise<void> {
    await this.stateStore.markCompensating(sagaId);

    for (let index = completedSteps.length - 1; index >= 0; index -= 1) {
      const stepName = completedSteps[index];
      const step = steps.find((candidate) => candidate.name === stepName);

      if (step) {
        await step.compensate(context, sagaId);
      }
    }

    await this.stateStore.markCompensated(sagaId);
  }
}
