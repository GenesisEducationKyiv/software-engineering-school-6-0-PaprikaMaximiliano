import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate, mockFindUnique, mockFindMany, mockUpdate, mockDeleteMany } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockFindUnique: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdate: vi.fn(),
    mockDeleteMany: vi.fn(),
  }));

vi.mock("../src/lib/prisma.js", () => ({
  prisma: {
    subscription: {
      create: mockCreate,
      findUnique: mockFindUnique,
      findMany: mockFindMany,
      update: mockUpdate,
      deleteMany: mockDeleteMany,
    },
  },
}));

import {
  SubscriptionService,
  SubscriptionConflictError,
  ValidationError,
  ResourceNotFoundError,
} from "../src/services/subscriptionService.js";
import {
  GitHubClient,
  GitHubNotFoundError,
  GitHubRateLimitError,
} from "../src/integrations/githubClient.js";
import { Mailer } from "../src/integrations/mailer.js";
import type { Subscription, Repository } from "@prisma/client";

const makeGithubClient = (): GitHubClient => {
  const client = new GitHubClient();
  vi.spyOn(client, "getLatestReleaseTag").mockResolvedValue("v1.0.0");
  return client;
};

const makeMailer = (): Mailer => {
  const mailer = new Mailer("from", {
    host: "host",
    port: 123,
    secure: true,
    user: "user",
    pass: "pass",
  });
  vi.spyOn(mailer, "sendConfirmationEmail").mockResolvedValue(undefined);
  return mailer;
};

const makeService = () => {
  const github = makeGithubClient();
  const mailer = makeMailer();
  const service = new SubscriptionService(
    github,
    mailer,
    "https://example.com",
  );
  return { service, github, mailer };
};

const makeSubscription = (
  overrides: Partial<Subscription> = {},
): Subscription => ({
  id: "sub-1",
  email: "user@example.com",
  confirmationToken: "confirm-token",
  unsubscribeToken: "unsub-token",
  confirmed: false,
  confirmedAt: null,
  repositoryId: "repo-1",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: "repo-1",
  fullName: "owner/repo",
  owner: "owner",
  name: "repo",
  lastSeenTag: "v1.0.0",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

type SubscriptionWithRepository = Subscription & { repository: Repository };

const makeSubscriptionWithRepository = (
  subOverrides: Partial<Subscription> = {},
  repoOverrides: Partial<Repository> = {},
): SubscriptionWithRepository => ({
  ...makeSubscription(subOverrides),
  repository: makeRepository(repoOverrides),
});

describe("SubscriptionService.subscribe()", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws ValidationError for an invalid email", async () => {
    const { service } = makeService();

    await expect(
      service.subscribe({ email: "not-an-email", repo: "owner/repo" }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError for an invalid repo format", async () => {
    const { service } = makeService();

    await expect(
      service.subscribe({ email: "user@example.com", repo: "badrepo" }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws ResourceNotFoundError when the GitHub repo does not exist", async () => {
    const { service, github } = makeService();
    vi.spyOn(github, "getLatestReleaseTag").mockRejectedValue(
      new GitHubNotFoundError("not found"),
    );

    await expect(
      service.subscribe({ email: "user@example.com", repo: "owner/repo" }),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it("re-throws GitHubRateLimitError without wrapping it", async () => {
    const { service, github } = makeService();
    vi.spyOn(github, "getLatestReleaseTag").mockRejectedValue(
      new GitHubRateLimitError({ retryAfterSeconds: 30 }),
    );

    await expect(
      service.subscribe({ email: "user@example.com", repo: "owner/repo" }),
    ).rejects.toThrow(GitHubRateLimitError);
  });

  it("throws SubscriptionConflictError on Prisma unique constraint violation", async () => {
    mockCreate.mockRejectedValue({ code: "P2002" });
    const { service } = makeService();

    await expect(
      service.subscribe({ email: "user@example.com", repo: "owner/repo" }),
    ).rejects.toThrow(SubscriptionConflictError);
  });

  it("creates a subscription and sends a confirmation email on the happy path", async () => {
    const created = makeSubscription({
      confirmationToken: "confirm-token-uuid",
      unsubscribeToken: "unsub-token-uuid",
    });
    mockCreate.mockResolvedValue(created);
    const { service, mailer } = makeService();

    await service.subscribe({ email: "user@example.com", repo: "owner/repo" });

    expect(mockCreate).toHaveBeenCalledOnce();
    expect(mailer.sendConfirmationEmail).toHaveBeenCalledWith({
      to: "user@example.com",
      repo: "owner/repo",
      confirmUrl: "https://example.com/api/confirm/confirm-token-uuid",
      unsubscribeUrl: "https://example.com/api/unsubscribe/unsub-token-uuid",
    });
  });

  it("passes the GitHub tag into the repository create payload", async () => {
    mockCreate.mockResolvedValue(makeSubscription());
    const { service, github } = makeService();
    vi.spyOn(github, "getLatestReleaseTag").mockResolvedValue("v9.9.9");

    await service.subscribe({ email: "user@example.com", repo: "owner/repo" });

    const createCall = mockCreate.mock.calls[0][0];
    expect(createCall.data.repository.connectOrCreate?.create.lastSeenTag).toBe(
      "v9.9.9",
    );
  });
});

describe("SubscriptionService.confirm()", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws ResourceNotFoundError when the token does not match any subscription", async () => {
    mockFindUnique.mockResolvedValue(null);
    const { service } = makeService();

    await expect(service.confirm("bad-token")).rejects.toThrow(
      ResourceNotFoundError,
    );
  });

  it("updates the subscription to confirmed when it is not yet confirmed", async () => {
    mockFindUnique.mockResolvedValue(makeSubscription({ confirmed: false }));
    mockUpdate.mockResolvedValue(
      makeSubscription({ confirmed: true, confirmedAt: new Date() }),
    );
    const { service } = makeService();

    await service.confirm("valid-token");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { confirmed: true, confirmedAt: expect.any(Date) },
    });
  });

  it("skips the update when the subscription is already confirmed (idempotent)", async () => {
    mockFindUnique.mockResolvedValue(makeSubscription({ confirmed: true }));
    const { service } = makeService();

    await service.confirm("valid-token");

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("SubscriptionService.unsubscribe()", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws ResourceNotFoundError when no subscription matches the token", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });
    const { service } = makeService();

    await expect(service.unsubscribe("ghost-token")).rejects.toThrow(
      ResourceNotFoundError,
    );
  });

  it("deletes the matching subscription on a valid token", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });
    const { service } = makeService();

    await expect(service.unsubscribe("valid-token")).resolves.toBeUndefined();
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { unsubscribeToken: "valid-token" },
    });
  });
});

describe("SubscriptionService.listByEmail()", () => {
  beforeEach(() => vi.resetAllMocks());

  it("throws ValidationError for an invalid email", async () => {
    const { service } = makeService();

    await expect(service.listByEmail("not-valid")).rejects.toThrow(
      ValidationError,
    );
  });

  it("maps Prisma rows to the SubscriptionResponse shape correctly", async () => {
    mockFindMany.mockResolvedValue([
      makeSubscriptionWithRepository(
        { email: "user@example.com", confirmed: true },
        { fullName: "owner/repo", lastSeenTag: "v1.0.0" },
      ),
      makeSubscriptionWithRepository(
        { email: "user@example.com", confirmed: false },
        { fullName: "owner/other", lastSeenTag: null },
      ),
    ]);
    const { service } = makeService();

    const result = await service.listByEmail("user@example.com");

    expect(result).toEqual([
      {
        email: "user@example.com",
        repo: "owner/repo",
        confirmed: true,
        last_seen_tag: "v1.0.0",
      },
      {
        email: "user@example.com",
        repo: "owner/other",
        confirmed: false,
        last_seen_tag: null,
      },
    ]);
  });

  it("returns an empty array when the email has no subscriptions", async () => {
    mockFindMany.mockResolvedValue([]);
    const { service } = makeService();

    const result = await service.listByEmail("user@example.com");

    expect(result).toEqual([]);
  });
});
