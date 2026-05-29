import { buildApp } from "../../../src/app";
import { prisma } from "../../../src/lib/prisma";
import { API_KEY, APP_BASE_URL } from "../constants";
import { DeterministicTokenGenerator } from "../fakes/DeterministicTokenGenerator";
import { FakeSourceControlClient } from "../fakes/FakeSourceControlClient";
import { RecordingMailer } from "../fakes/RecordingMailer";

export function createIntegrationTestContext() {
  const mailer = new RecordingMailer();
  const tokenGenerator = new DeterministicTokenGenerator();
  const sourceControlClient = new FakeSourceControlClient();

  const appPromise = buildApp({
    apiKey: API_KEY,
    appBaseUrl: APP_BASE_URL,
    enableScanner: false,
    mailer,
    githubClient: sourceControlClient,
    tokenGenerator,
  });

  return {
    mailer,
    tokenGenerator,
    sourceControlClient,
    appPromise,
    async reset() {
      await prisma.subscription.deleteMany();
      await prisma.repository.deleteMany();
      mailer.reset();
      tokenGenerator.reset();
      sourceControlClient.reset();
    },
    async ready() {
      const app = await appPromise;
      await app.ready();
    },
    async close() {
      const app = await appPromise;
      await app.close();
      await prisma.$disconnect();
    },
  };
}

export type IntegrationTestContext = ReturnType<typeof createIntegrationTestContext>;
