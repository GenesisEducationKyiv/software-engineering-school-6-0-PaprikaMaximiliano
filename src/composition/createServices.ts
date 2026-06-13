import { env } from "../config";
import { GitHubClient } from "../integrations/GithubClient";
import { Mailer } from "../integrations/Mailer";
import type { IMailer } from "../integrations/ports/IMailer";
import type { ISourceControlClient } from "../integrations/ports/ISourceControlClient";
import { SubscriptionRepository } from "../repositories/prisma/SubscriptionRepository";
import { SubscriptionService } from "../services/SubscriptionService";
import { RepoValidator } from "../subscription/RepoValidator";
import { SubscriptionUrlBuilder } from "../subscription/UrlBuilder";
import { UUIDTokenGenerator } from "../subscription/UUIDTokenGenerator";
import type { BuildAppOptions } from "./buildAppOptions";

export type AppServices = {
  githubClient: ISourceControlClient;
  mailer: IMailer;
  appBaseUrl: string;
  subscriptionService: SubscriptionService;
};

export function createServices(options: BuildAppOptions): AppServices {
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
  const tokenGenerator = options.tokenGenerator ?? new UUIDTokenGenerator();
  const appBaseUrl = options.appBaseUrl ?? env.APP_BASE_URL;

  const subscriptionService = new SubscriptionService(
    subscriptionRepository,
    mailer,
    tokenGenerator,
    new SubscriptionUrlBuilder(appBaseUrl),
    new RepoValidator(githubClient),
  );

  return {
    githubClient,
    mailer,
    appBaseUrl,
    subscriptionService,
  };
}
