export const SAGA_STATUS = {
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  COMPENSATING: "COMPENSATING",
  COMPENSATED: "COMPENSATED",
  FAILED: "FAILED",
} as const;

export type SagaStatus = (typeof SAGA_STATUS)[keyof typeof SAGA_STATUS];

export interface SagaStep<TContext> {
  name: string;
  execute(context: TContext, sagaId: string): Promise<void>;
  compensate(context: TContext, sagaId: string): Promise<void>;
}

export interface CreateSagaInput {
  type: string;
  payload: unknown;
}

export interface SagaRunOptions<TContext> {
  type: string;
  payload: unknown;
  context: TContext;
  steps: SagaStep<TContext>[];
}
