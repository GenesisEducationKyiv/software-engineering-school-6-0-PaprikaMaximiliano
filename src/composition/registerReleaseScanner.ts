import type { FastifyInstance } from "fastify";
import { env } from "../config";
import { RepositoryRepository } from "../repositories/prisma/RepositoryRepository";
import { ReleaseScannerService } from "../services/ReleaseScanner";
import type { BuildAppOptions } from "./buildAppOptions";
import type { AppServices } from "./createServices";

export function registerReleaseScanner(
  app: FastifyInstance,
  options: BuildAppOptions,
  deps: Pick<AppServices, "githubClient" | "mailer" | "appBaseUrl">,
): void {
  const repositoryRepository = options.repositoryRepository ?? new RepositoryRepository();
  const scanner = new ReleaseScannerService(
    deps.githubClient,
    deps.mailer,
    env.SCAN_INTERVAL_MS,
    deps.appBaseUrl,
    app.log,
    repositoryRepository,
  );

  app.addHook("onReady", () => {
    scanner.start();
  });

  app.addHook("onClose", () => {
    scanner.stop();
  });
}
