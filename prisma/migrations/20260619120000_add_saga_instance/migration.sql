-- CreateTable
CREATE TABLE "SagaInstance" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "currentStep" TEXT,
    "payload" JSONB NOT NULL,
    "completedSteps" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SagaInstance_pkey" PRIMARY KEY ("id")
);
