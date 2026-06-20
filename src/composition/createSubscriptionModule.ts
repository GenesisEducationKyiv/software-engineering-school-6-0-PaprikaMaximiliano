import { env } from "../platform/config";
import { GitHubClient } from "../platform/integrations/GithubClient";
import {
  BullMqNotificationPublisher,
  createNotificationQueue,
} from "../platform/messaging/bullmq/BullMqNotificationPublisher";
import {
  BullMqSagaNotificationParticipant,
  createSagaNotificationQueue,
  createSagaNotificationQueueEvents,
} from "../platform/messaging/bullmq/BullMqSagaNotificationParticipant";
import type { INotificationPublisher } from "../platform/messaging/ports/INotificationPublisher";
import type { ISagaNotificationParticipant } from "../platform/messaging/ports/ISagaNotificationParticipant";
import type { ISourceControlClient } from "../platform/integrations/ports/ISourceControlClient";
import { createSubscriptionApiPlugin } from "../modules/subscription/api/subscriptionApiPlugin";
import { ScannerAccessService } from "../modules/subscription/application/ScannerAccessService";
import { SubscriptionService } from "../modules/subscription/application/SubscriptionService";
import { SubscribeSagaOrchestrator } from "../modules/subscription/application/sagas/SubscribeSagaOrchestrator";
import { RepoValidator } from "../modules/subscription/domain/RepoValidator";
import { SubscriptionUrlBuilder } from "../modules/subscription/domain/UrlBuilder";
import { UUIDTokenGenerator } from "../modules/subscription/domain/UUIDTokenGenerator";
import { RepositoryRepository } from "../modules/subscription/infrastructure/prisma/RepositoryRepository";
import { SubscriptionRepository } from "../modules/subscription/infrastructure/prisma/SubscriptionRepository";
import { SagaOrchestrator } from "../platform/saga/SagaOrchestrator";
import { PrismaSagaStateStore } from "../platform/saga/infrastructure/PrismaSagaStateStore";
import type { BuildAppOptions } from "./buildAppOptions";

export type SubscriptionModule = {
  githubClient: ISourceControlClient;
  notificationPublisher: INotificationPublisher;
  appBaseUrl: string;
  subscriptionService: SubscriptionService;
  scannerAccessService: ScannerAccessService;
  apiPlugin: ReturnType<typeof createSubscriptionApiPlugin>;
  close(): Promise<void>;
};

export function createSubscriptionModule(options: BuildAppOptions): SubscriptionModule {
  const githubClient = options.githubClient ?? new GitHubClient(env.GITHUB_TOKEN);
  const notificationPublisher =
    options.notificationPublisher ??
    new BullMqNotificationPublisher(createNotificationQueue(env.REDIS_URL));
  const subscriptionRepository = options.subscriptionRepository ?? new SubscriptionRepository();
  const repositoryRepository = options.repositoryRepository ?? new RepositoryRepository();
  const tokenGenerator = options.tokenGenerator ?? new UUIDTokenGenerator();
  const appBaseUrl = options.appBaseUrl ?? env.APP_BASE_URL;
  const urlBuilder = new SubscriptionUrlBuilder(appBaseUrl);
  const sagaStateStore = options.sagaStateStore ?? new PrismaSagaStateStore();

  const sagaQueueEvents =
    options.sagaNotificationParticipant === undefined
      ? createSagaNotificationQueueEvents(env.REDIS_URL)
      : null;
  const sagaQueue =
    options.sagaNotificationParticipant === undefined
      ? createSagaNotificationQueue(env.REDIS_URL)
      : null;

  const sagaNotificationParticipant: ISagaNotificationParticipant =
    options.sagaNotificationParticipant ??
    new BullMqSagaNotificationParticipant(sagaQueue!, sagaQueueEvents!);

  const subscribeSagaOrchestrator = new SubscribeSagaOrchestrator(
    new SagaOrchestrator(sagaStateStore),
    sagaNotificationParticipant,
    tokenGenerator,
    urlBuilder,
    subscriptionRepository,
  );

  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    subscribeSagaOrchestrator,
    new RepoValidator(githubClient),
  );
  const scannerAccessService = new ScannerAccessService(repositoryRepository, urlBuilder);
  const apiKey = options.apiKey ?? env.API_KEY;
  const apiPlugin = createSubscriptionApiPlugin(subscriptionService, apiKey);

  return {
    githubClient,
    notificationPublisher,
    appBaseUrl,
    subscriptionService,
    scannerAccessService,
    apiPlugin,
    async close() {
      if (sagaQueueEvents) {
        await sagaQueueEvents.close();
      }

      if (sagaQueue) {
        await sagaQueue.close();
      }
    },
  };
}
