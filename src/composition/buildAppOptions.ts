import type { FastifyServerOptions } from "fastify";
import type { ISourceControlClient } from "../platform/integrations/ports/ISourceControlClient";
import type { INotificationPublisher } from "../platform/messaging/ports/INotificationPublisher";
import type { IRepositoryRepository } from "../modules/subscription/domain/ports/IRepositoryRepository";
import type { ISubscriptionRepository } from "../modules/subscription/domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "../modules/subscription/domain/ports/ITokenGenerator";

export interface BuildAppOptions {
  apiKey?: string | null;
  appBaseUrl?: string;
  githubClient?: ISourceControlClient;
  logger?: FastifyServerOptions["logger"];
  notificationPublisher?: INotificationPublisher;
  repositoryRepository?: IRepositoryRepository;
  subscriptionRepository?: ISubscriptionRepository;
  tokenGenerator?: ITokenGenerator;
}
