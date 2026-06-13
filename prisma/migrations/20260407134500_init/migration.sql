-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastSeenTag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmationToken" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "repositoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_confirmationToken_key" ON "Subscription"("confirmationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_unsubscribeToken_key" ON "Subscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "Subscription_email_idx" ON "Subscription"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_email_repositoryId_key" ON "Subscription"("email", "repositoryId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

