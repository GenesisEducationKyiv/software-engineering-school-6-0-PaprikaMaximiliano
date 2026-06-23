import { buildApp } from "../../../src/app";
import { prisma } from "../../../src/platform/persistence/prisma";
import { API_KEY, APP_BASE_URL } from "../constants";
import { DeterministicTokenGenerator } from "../fakes/DeterministicTokenGenerator";
import { FakeSourceControlClient } from "../fakes/FakeSourceControlClient";
import { RecordingMailer } from "../fakes/RecordingMailer";
import { SyncNotificationPublisher } from "../fakes/SyncNotificationPublisher";
import { SyncSagaNotificationParticipant } from "../fakes/SyncSagaNotificationParticipant";

export function createIntegrationTestContext() {
  const mailer = new RecordingMailer();
  const notificationPublisher = new SyncNotificationPublisher(mailer);
  const sagaNotificationParticipant = new SyncSagaNotificationParticipant(notificationPublisher);
  const tokenGenerator = new DeterministicTokenGenerator();
  const sourceControlClient = new FakeSourceControlClient();

  const appPromise = buildApp({
    apiKey: API_KEY,
    appBaseUrl: APP_BASE_URL,
    logger: false,
    notificationPublisher,
    sagaNotificationParticipant,
    githubClient: sourceControlClient,
    tokenGenerator,
  }).then(({ app }) => app);

  return {
    mailer,
    tokenGenerator,
    sourceControlClient,
    appPromise,
    async reset() {
      await prisma.subscription.deleteMany();
      await prisma.repository.deleteMany();
      await prisma.sagaInstance.deleteMany();
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
