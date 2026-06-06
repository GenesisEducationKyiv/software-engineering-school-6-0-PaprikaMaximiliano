import type { FastifyServerOptions } from "fastify";
import type { IMailer } from "../platform/integrations/ports/IMailer";
import type { ISourceControlClient } from "../platform/integrations/ports/ISourceControlClient";
import type { IRepositoryRepository } from "../modules/subscription/domain/ports/IRepositoryRepository";
import type { ISubscriptionRepository } from "../modules/subscription/domain/ports/ISubscriptionRepository";
import type { ITokenGenerator } from "../modules/subscription/domain/ports/ITokenGenerator";

export interface BuildAppOptions {
  apiKey?: string | null;
  appBaseUrl?: string;
  githubClient?: ISourceControlClient;
  logger?: FastifyServerOptions["logger"];
  mailer?: IMailer;
  repositoryRepository?: IRepositoryRepository;
  subscriptionRepository?: ISubscriptionRepository;
  tokenGenerator?: ITokenGenerator;
}
