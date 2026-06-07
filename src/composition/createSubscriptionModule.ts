import { env } from "../platform/config";
import { GitHubClient } from "../platform/integrations/GithubClient";
import { Mailer } from "../platform/integrations/Mailer";
import type { IMailer } from "../platform/integrations/ports/IMailer";
import type { ISourceControlClient } from "../platform/integrations/ports/ISourceControlClient";
import { createSubscriptionApiPlugin } from "../modules/subscription/api/subscriptionApiPlugin";
import { ScannerAccessService } from "../modules/subscription/application/ScannerAccessService";
import { SubscriptionService } from "../modules/subscription/application/SubscriptionService";
import { RepoValidator } from "../modules/subscription/domain/RepoValidator";
import { SubscriptionUrlBuilder } from "../modules/subscription/domain/UrlBuilder";
import { UUIDTokenGenerator } from "../modules/subscription/domain/UUIDTokenGenerator";
import { RepositoryRepository } from "../modules/subscription/infrastructure/prisma/RepositoryRepository";
import { SubscriptionRepository } from "../modules/subscription/infrastructure/prisma/SubscriptionRepository";
import type { BuildAppOptions } from "./buildAppOptions";

export type SubscriptionModule = {
  githubClient: ISourceControlClient;
  mailer: IMailer;
  appBaseUrl: string;
  subscriptionService: SubscriptionService;
  scannerAccessService: ScannerAccessService;
  apiPlugin: ReturnType<typeof createSubscriptionApiPlugin>;
};

export function createSubscriptionModule(options: BuildAppOptions): SubscriptionModule {
  const githubClient = options.githubClient ?? new GitHubClient(env.GITHUB_TOKEN);
  const mailer =
    options.mailer ??
    new Mailer(env.MAIL_FROM, {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    });
  const subscriptionRepository = options.subscriptionRepository ?? new SubscriptionRepository();
  const repositoryRepository = options.repositoryRepository ?? new RepositoryRepository();
  const tokenGenerator = options.tokenGenerator ?? new UUIDTokenGenerator();
  const appBaseUrl = options.appBaseUrl ?? env.APP_BASE_URL;
  const urlBuilder = new SubscriptionUrlBuilder(appBaseUrl);

  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    mailer,
    tokenGenerator,
    urlBuilder,
    new RepoValidator(githubClient),
  );
  const scannerAccessService = new ScannerAccessService(repositoryRepository, urlBuilder);
  const apiKey = options.apiKey ?? env.API_KEY;
  const apiPlugin = createSubscriptionApiPlugin(subscriptionService, apiKey);

  return {
    githubClient,
    mailer,
    appBaseUrl,
    subscriptionService,
    scannerAccessService,
    apiPlugin,
  };
}
