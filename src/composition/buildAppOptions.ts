import type { ISourceControlClient } from "../platform/integrations/ports/ISourceControlClient";
import type { INotificationPublisher } from "../platform/messaging/ports/INotificationPublisher";
import type { ISagaNotificationParticipant } from "../platform/messaging/ports/ISagaNotificationParticipant";
import type { ISagaStateStore } from "../platform/saga/ports/ISagaStateStore";
import type { IRepositoryRepository } from "../modules/subscription/domain/ports/IRepositoryRepository";
import type { ISubscriptionRepository } from "../modules/subscription/domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "../modules/subscription/domain/ports/ITokenGenerator";
import type { FastifyServerOptions } from "fastify";

export interface BuildAppOptions {
  apiKey?: string | null;
  appBaseUrl?: string;
  githubClient?: ISourceControlClient;
  logger?: FastifyServerOptions["logger"];
  notificationPublisher?: INotificationPublisher;
  sagaNotificationParticipant?: ISagaNotificationParticipant;
  sagaStateStore?: ISagaStateStore;
  repositoryRepository?: IRepositoryRepository;
  subscriptionRepository?: ISubscriptionRepository;
  tokenGenerator?: ITokenGenerator;
}

export type AppLifecycle = {
  close(): Promise<void>;
};

export type BuildAppResult = {
  lifecycle?: AppLifecycle;
};
