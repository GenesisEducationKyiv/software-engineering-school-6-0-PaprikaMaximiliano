import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFindMany, mockUpdateMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockUpdateMany: vi.fn(),
}));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    repository: {
      findMany: mockFindMany,
      updateMany: mockUpdateMany,
    },
  },
}));

import { ReleaseScanner } from "../src/services/releaseScanner.js";
import {
  GitHubClient,
  GitHubRateLimitError,
} from "../src/integrations/githubClient.js";
import type { Mailer } from "../src/integrations/mailer.js";

type RepositoryWithSubscriptions = {
  id: string;
  fullName: string;
  lastSeenTag: string | null;
  subscriptions: Array<{ email: string; unsubscribeToken: string }>;
};

const makeRepo = (
  overrides: Partial<RepositoryWithSubscriptions> = {},
): RepositoryWithSubscriptions => ({
  id: "repo-1",
  fullName: "facebook/react",
  lastSeenTag: "v18.0.0",
  subscriptions: [
    { email: "user1@test.com", unsubscribeToken: "token1" },
    { email: "user2@test.com", unsubscribeToken: "token2" },
  ],
  ...overrides,
});

const makeGithubClient = (): GitHubClient => {
  const client = new GitHubClient();
  vi.spyOn(client, "getLatestReleaseTag").mockResolvedValue(null);
  return client;
};

const makeMailer = (): Pick<Mailer, "sendReleaseEmail"> => ({
  sendReleaseEmail: vi.fn().mockResolvedValue(undefined),
});

const makeLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

const makeScanner = () => {
  const github = makeGithubClient();
  const mailer = makeMailer() as Mailer;
  const logger = makeLogger();
  const scanner = new ReleaseScanner(
    github,
    mailer,
    10_000,
    "https://myapp.com",
    logger,
  );
  return { scanner, github, mailer, logger };
};

describe("ReleaseScanner.scanOnce()", () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(() => vi.useRealTimers());

  it("does nothing if the tag has not changed", async () => {
    mockFindMany.mockResolvedValue([makeRepo({ lastSeenTag: "v18.0.0" })]);
    const { scanner, mailer } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag").mockResolvedValue(
      "v18.0.0",
    );

    await scanner.scanOnce();

    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mailer.sendReleaseEmail).not.toHaveBeenCalled();
  });

  it("does nothing if the latest tag is null", async () => {
    mockFindMany.mockResolvedValue([makeRepo()]);
    const { scanner, mailer } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag").mockResolvedValue(
      null,
    );

    await scanner.scanOnce();

    expect(mockUpdateMany).not.toHaveBeenCalled();
    expect(mailer.sendReleaseEmail).not.toHaveBeenCalled();
  });

  it("updates the DB and sends emails when a new release is found", async () => {
    const repo = makeRepo();
    mockFindMany.mockResolvedValue([repo]);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    const { scanner, mailer, logger } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag").mockResolvedValue(
      "v19.0.0",
    );

    await scanner.scanOnce();

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: repo.id, lastSeenTag: repo.lastSeenTag },
      data: { lastSeenTag: "v19.0.0" },
    });
    expect(mailer.sendReleaseEmail).toHaveBeenCalledTimes(2);
    expect(mailer.sendReleaseEmail).toHaveBeenCalledWith({
      to: "user1@test.com",
      repo: "facebook/react",
      tag: "v19.0.0",
      unsubscribeUrl: "https://myapp.com/api/unsubscribe/token1",
    });
    expect(logger.info).toHaveBeenCalledWith(
      { repository: "facebook/react", tag: "v19.0.0" },
      "new release notifications sent",
    );
  });

  it("skips emails when another process already updated the DB (optimistic lock)", async () => {
    mockFindMany.mockResolvedValue([makeRepo()]);
    mockUpdateMany.mockResolvedValue({ count: 0 });
    const { scanner, mailer, logger } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag").mockResolvedValue(
      "v19.0.0",
    );

    await scanner.scanOnce();

    expect(mailer.sendReleaseEmail).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      { repository: "facebook/react" },
      "skipped - already updated by another process",
    );
  });

  it("logs error and continues scanning remaining repos when one fails", async () => {
    const repo1 = makeRepo({ id: "repo-1", fullName: "facebook/react" });
    const repo2 = makeRepo({ id: "repo-2", fullName: "vuejs/vue" });
    mockFindMany.mockResolvedValue([repo1, repo2]);
    mockUpdateMany.mockResolvedValue({ count: 1 });

    const genericError = new Error("Network timeout");
    const { scanner, mailer, logger } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag")
      .mockRejectedValueOnce(genericError)
      .mockResolvedValueOnce("v3.0.0");

    await scanner.scanOnce();

    expect(logger.error).toHaveBeenCalledWith(
      { repository: "facebook/react", error: genericError },
      "failed to scan repository",
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "repo-2", lastSeenTag: repo2.lastSeenTag },
      data: { lastSeenTag: "v3.0.0" },
    });
    expect(mailer.sendReleaseEmail).toHaveBeenCalled();
  });

  it("pauses scanning on GitHubRateLimitError and skips until pause expires", async () => {
    vi.useFakeTimers();

    const repo = makeRepo();
    mockFindMany.mockResolvedValue([repo]);

    const rateLimitError = new GitHubRateLimitError({ retryAfterSeconds: 60 });
    const { scanner, logger } = makeScanner();
    vi.spyOn(scanner["githubClient"], "getLatestReleaseTag")
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValue("v19.0.0");

    await scanner.scanOnce();

    expect(logger.warn).toHaveBeenCalledWith(
      { retryAfterSeconds: 60 },
      "scanner paused due to GitHub rate limit",
    );

    vi.advanceTimersByTime(30_000);
    mockFindMany.mockClear();
    await scanner.scanOnce();
    expect(mockFindMany).not.toHaveBeenCalled();

    vi.advanceTimersByTime(31_000);
    mockUpdateMany.mockResolvedValue({ count: 1 });
    await scanner.scanOnce();
    expect(mockFindMany).toHaveBeenCalled();
  });
});
