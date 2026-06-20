export interface ISagaStateStore {
  create(input: { type: string; payload: unknown }): Promise<string>;
  updateProgress(sagaId: string, currentStep: string, completedSteps: string[]): Promise<void>;
  markCompleted(sagaId: string, completedSteps: string[]): Promise<void>;
  markCompensating(sagaId: string): Promise<void>;
  markCompensated(sagaId: string): Promise<void>;
}
