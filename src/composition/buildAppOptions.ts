import type { IMailer } from "../integrations/ports/IMailer";
import type { ISourceControlClient } from "../integrations/ports/ISourceControlClient";
import type { IRepositoryRepository } from "../repositories/IRepositoryRepository";
import type { ISubscriptionRepository } from "../repositories/ISubscriptionRepository";
import type { ITokenGenerator } from "../subscription/ports/ITokenGenerator";

export interface BuildAppOptions {
  apiKey?: string | null;
  appBaseUrl?: string;
  enableScanner?: boolean;
  githubClient?: ISourceControlClient;
  mailer?: IMailer;
  repositoryRepository?: IRepositoryRepository;
  subscriptionRepository?: ISubscriptionRepository;
  tokenGenerator?: ITokenGenerator;
}
